import { IsInt, IsString, Min } from 'class-validator';

export class AssignIncidentDto {
  @IsString()
  assignee_id!: string;

  @IsInt()
  @Min(1)
  expected_version!: number;
}
