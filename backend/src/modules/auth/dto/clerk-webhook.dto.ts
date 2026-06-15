export class ClerkWebhookDto {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string;
    last_name: string;
    image_url: string;
    phone_numbers: Array<{ phone_number: string }>;
    public_metadata?: { role?: string };
  };
}
