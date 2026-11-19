import {
  IsDefined,
  IsEmail,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RequestNotificationDto {
  @IsUUID()
  @IsDefined()
  templateId!: string;

  @IsString()
  @IsEmail()
  @MaxLength(254)
  @IsDefined()
  recipient!: string;

  @IsDefined()
  @IsObject()
  data!: Record<string, unknown>;
}
