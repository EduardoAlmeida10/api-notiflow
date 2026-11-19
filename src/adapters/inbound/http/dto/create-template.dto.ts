import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'O nome deve conter apenas letras minúsculas, números e underscore',
  })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/\S/, {
    message: 'O assunto não pode conter apenas espaços',
  })
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @Matches(/\S/, {
    message: 'O corpo não pode conter apenas espaços',
  })
  body!: string;
}
