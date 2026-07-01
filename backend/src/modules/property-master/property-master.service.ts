import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface FieldUpdateDto {
  fieldKey:    string;
  fieldValue:  string;
  userId:      string;
}

@Injectable()
export class PropertyMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async getForCase(caseId: string) {
    const db = this.prisma as any;
    const master = await db.propertyMaster.findUnique({
      where:   { caseId },
      include: { fields: { orderBy: { fieldKey: 'asc' } } },
    });
    if (!master) return null;
    return this.formatMaster(master);
  }

  async getOrCreateForCase(caseId: string) {
    const db = this.prisma as any;
    let master = await db.propertyMaster.findUnique({
      where: { caseId },
      include: { fields: { orderBy: { fieldKey: 'asc' } } },
    });
    if (!master) {
      master = await db.propertyMaster.create({
        data: { id: randomUUID(), caseId, version: 1, status: 'DRAFT', masterJson: {} },
        include: { fields: true },
      });
    }
    return this.formatMaster(master);
  }

  async updateField(caseId: string, dto: FieldUpdateDto) {
    const db   = this.prisma as any;
    const master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) throw new NotFoundException('Property master not found for this case');

    // Get existing value for history
    const existing = await db.propertyField.findUnique({
      where: { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: dto.fieldKey } },
    });
    const before = existing?.fieldValue ?? null;

    await db.propertyField.upsert({
      where:  { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: dto.fieldKey } },
      create: {
        id:               randomUUID(),
        propertyMasterId: master.id,
        fieldKey:         dto.fieldKey,
        fieldValue:       dto.fieldValue,
        confidence:       1.0,
        isManualEdit:     true,
        editedById:       dto.userId,
        editedAt:         new Date(),
      },
      update: {
        fieldValue:   dto.fieldValue,
        confidence:   1.0,
        isManualEdit: true,
        editedById:   dto.userId,
        editedAt:     new Date(),
      },
    });

    // Record history
    await db.propertyMasterHistory.create({
      data: {
        id:               randomUUID(),
        propertyMasterId: master.id,
        changedById:      dto.userId,
        changeType:       'FIELD_EDIT',
        fieldKey:         dto.fieldKey,
        before,
        after:            dto.fieldValue,
      },
    });

    // Rebuild masterJson
    await this.rebuildMasterJson(master.id);

    return this.getForCase(caseId);
  }

  async updateStatus(caseId: string, status: 'DRAFT' | 'REVIEWED' | 'CONFIRMED', userId: string) {
    const db   = this.prisma as any;
    const master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) throw new NotFoundException('Property master not found');

    const update: any = { status };
    if (status === 'REVIEWED')  { update.reviewedById = userId; update.reviewedAt = new Date(); }
    if (status === 'CONFIRMED') { update.confirmedAt  = new Date(); }

    await db.propertyMaster.update({ where: { id: master.id }, data: update });

    await db.propertyMasterHistory.create({
      data: {
        id:               randomUUID(),
        propertyMasterId: master.id,
        changedById:      userId,
        changeType:       'STATUS_CHANGE',
        after:            status,
      },
    });

    return this.getForCase(caseId);
  }

  async getHistory(caseId: string) {
    const db   = this.prisma as any;
    const master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) return [];
    return db.propertyMasterHistory.findMany({
      where:   { propertyMasterId: master.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async addField(caseId: string, dto: FieldUpdateDto) {
    return this.updateField(caseId, dto);
  }

  async deleteField(caseId: string, fieldKey: string, userId: string) {
    const db   = this.prisma as any;
    const master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) throw new NotFoundException('Property master not found');

    const existing = await db.propertyField.findUnique({
      where: { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey } },
    });
    if (!existing) throw new NotFoundException('Field not found');

    await db.propertyField.delete({
      where: { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey } },
    });

    await db.propertyMasterHistory.create({
      data: {
        id:               randomUUID(),
        propertyMasterId: master.id,
        changedById:      userId,
        changeType:       'FIELD_DELETE',
        fieldKey,
        before:           existing.fieldValue,
        after:            null,
      },
    });

    await this.rebuildMasterJson(master.id);
    return this.getForCase(caseId);
  }

  private async rebuildMasterJson(masterId: string): Promise<void> {
    const db     = this.prisma as any;
    const fields = await db.propertyField.findMany({ where: { propertyMasterId: masterId } });
    const masterJson: Record<string, string> = {};
    for (const f of fields) {
      if (f.fieldValue) masterJson[f.fieldKey] = f.fieldValue;
    }
    await db.propertyMaster.update({
      where: { id: masterId },
      data:  { masterJson, version: { increment: 1 } },
    });
  }

  private formatMaster(master: any) {
    const fields = (master.fields ?? []).map((f: any) => ({
      fieldKey:        f.fieldKey,
      label:           f.label ?? null,
      fieldValue:      f.fieldValue,
      confidence:      Number(f.confidence),
      sourcePage:      f.sourcePage,
      sourceLine:      f.sourceLine,
      sourceDocumentId: f.sourceDocumentId,
      isManualEdit:    f.isManualEdit,
      editedAt:        f.editedAt,
      lowConfidence:   Number(f.confidence) < 0.75 && !f.isManualEdit,
    }));

    return {
      id:           master.id,
      caseId:       master.caseId,
      version:      master.version,
      status:       master.status,
      reviewedAt:   master.reviewedAt,
      confirmedAt:  master.confirmedAt,
      masterJson:   master.masterJson,
      fields,
      stats: {
        total:          fields.length,
        highConfidence: fields.filter((f: any) => f.confidence >= 0.85).length,
        lowConfidence:  fields.filter((f: any) => f.lowConfidence).length,
        manualEdits:    fields.filter((f: any) => f.isManualEdit).length,
      },
    };
  }
}
