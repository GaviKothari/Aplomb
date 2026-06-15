import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';
import * as fs from 'fs';

const REPORT_FIELD_SCHEMA = `{
  "propertyDescription": "string",
  "propertyType": "enum: RESIDENTIAL_APARTMENT|RESIDENTIAL_INDEPENDENT|RESIDENTIAL_VILLA|RESIDENTIAL_PLOT|COMMERCIAL_OFFICE|COMMERCIAL_RETAIL|COMMERCIAL_WAREHOUSE|INDUSTRIAL|AGRICULTURAL|MIXED_USE",
  "constructionStage": "enum: VACANT_LAND|FOUNDATION|PLINTH|UNDER_CONSTRUCTION|COMPLETED|SEMI_FINISHED|OLD_CONSTRUCTION",
  "totalFloors": "number",
  "totalArea": "number in sqft",
  "builtUpArea": "number in sqft",
  "carpetArea": "number in sqft",
  "plotArea": "number in sqft",
  "ageOfConstruction": "number in years",
  "roadWidth": "number in meters",
  "facingDirection": "string",
  "landRatePerSqFt": "number in INR",
  "buildingRatePerSqFt": "number in INR",
  "totalMarketValue": "number in INR",
  "siteObservations": "string (professional English)",
  "boundaryDescription": "string",
  "amenities": ["array of strings"],
  "localityFeatures": ["array of strings"],
  "nearbyLandmarks": "string",
  "marketabilityRating": "number 1-5",
  "liquidityRating": "number 1-5",
  "confidence": "number 0-100",
  "needs_review_fields": ["array of field names with low confidence"]
}`;

@Injectable()
export class AiReportingService {
  private readonly logger = new Logger(AiReportingService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI reporting features disabled');
    }
  }

  private get ai(): OpenAI {
    if (!this.openai) throw new BadRequestException('AI features are not configured on this server');
    return this.openai;
  }

  async startSession(caseId: string, userId: string, language = 'en') {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { organization: true },
    });
    if (!caseData) throw new NotFoundException('Case not found');

    const session = await this.prisma.aiChatSession.create({
      data: { caseId, userId, language, sessionType: 'REPORTING', status: 'ACTIVE' },
    });

    // First message: system context + greeting
    const systemPrompt = this.buildSystemPrompt(caseData, language);
    const greeting = await this.chat(session.id, systemPrompt, 'SYSTEM', false);

    const welcome = await this.ai.chat.completions.create({
      model: this.config.get('openai.model'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Start the property inspection interview. Ask the first question.' },
      ],
      max_tokens: 300,
    });

    const firstMessage = welcome.choices[0].message.content;
    await this.chat(session.id, firstMessage, 'ASSISTANT', false);

    return { session, firstMessage };
  }

  async sendMessage(sessionId: string, content: string) {
    const session = await this.prisma.aiChatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session is not active');

    // Save user message
    await this.chat(sessionId, content, 'USER', false);

    // Build message history for OpenAI
    const caseData = session.caseId
      ? await this.prisma.case.findUnique({
          where: { id: session.caseId },
          include: { organization: true },
        })
      : null;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(caseData, session.language) },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as any,
        content: m.content,
      })),
      { role: 'user', content },
    ];

    const completion = await this.ai.chat.completions.create({
      model: this.config.get('openai.model'),
      messages,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;

    // Update token count
    await this.prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { tokenCount: { increment: completion.usage?.total_tokens || 0 } },
    });

    const saved = await this.chat(sessionId, reply, 'ASSISTANT', false);
    return { message: saved, isComplete: reply.includes('[COMPLETE]') };
  }

  async transcribeVoice(sessionId: string, audioBuffer: Buffer, mimeType: string) {
    // Save to temp file
    const tempPath = `/tmp/audio_${Date.now()}.webm`;
    fs.writeFileSync(tempPath, audioBuffer);

    try {
      const transcription = await this.ai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        language: undefined, // auto-detect language
        response_format: 'verbose_json',
      });

      const text = transcription.text;
      const detectedLanguage = (transcription as any).language || 'en';

      // Save voice message
      await this.prisma.aiChatMessage.create({
        data: {
          sessionId,
          role: 'USER',
          content: text,
          transcription: text,
          detectedLanguage,
        },
      });

      // Now process as text message
      return this.sendMessage(sessionId, text);
    } finally {
      fs.unlinkSync(tempPath);
    }
  }

  async generateReport(sessionId: string) {
    const session = await this.prisma.aiChatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    const conversationText = session.messages
      .filter((m) => m.role !== 'SYSTEM')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const completion = await this.ai.chat.completions.create({
      model: this.config.get('openai.visionModel'),
      messages: [
        {
          role: 'system',
          content: `You are a property valuation expert. Extract structured data from the inspection conversation and output ONLY valid JSON matching this schema: ${REPORT_FIELD_SCHEMA}. Convert all values to professional English. Calculate estimated valuations if rates are mentioned.`,
        },
        {
          role: 'user',
          content: `Extract report data from this conversation:\n\n${conversationText}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const extracted = JSON.parse(completion.choices[0].message.content);

    // Mark session complete
    await this.prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return { fields: extracted, sessionId };
  }

  async analyzePhoto(imageBase64: string, caseId: string) {
    const response = await this.ai.chat.completions.create({
      model: this.config.get('openai.visionModel'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this property photo. Return JSON with: { quality_score: 0-100, is_blurry: bool, has_property: bool, estimated_angle: "front|rear|left|right|interior|surrounding|document", construction_stage: string, issues: [string], description: string }',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  private buildSystemPrompt(caseData: any, language: string): string {
    return `You are APLOMB's Property Inspection Assistant helping a site engineer document a property.

Case Details:
- Property: ${caseData?.propertyAddress || 'Unknown'}
- Type: ${caseData?.propertyType || 'Unknown'}
- Bank: ${caseData?.organization?.name || 'Unknown'}

Instructions:
1. Ask ONE question at a time, in a friendly conversational tone
2. Accept answers in Hindi, English, or Hinglish — understand all
3. If unclear, ask ONE clarifying follow-up
4. Convert all responses to professional English for the report
5. After all 10 questions, include [COMPLETE] to signal generation

Question Flow:
Q1: Construction stage / condition of property?
Q2: Property configuration (floors, rooms, BHK)?
Q3: Total area (any unit — you'll convert to sqft)?
Q4: Road width and property access?
Q5: Construction quality and materials used?
Q6: Structural observations and condition?
Q7: Surrounding area and locality?
Q8: Amenities and facilities?
Q9: Any encroachments, legal issues, or concerns?
Q10: Estimated market rate per sqft in this area?

Language: ${language === 'hi' ? 'Respond in Hindi but record data in English' : 'English'}`;
  }

  private async chat(sessionId: string, content: string, role: string, save = true) {
    return this.prisma.aiChatMessage.create({
      data: { sessionId, role, content },
    });
  }
}
