import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Логин администратора' })
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }

  @Post('register-admin')
  @ApiOperation({ summary: 'Создать администратора' })
  async registerAdmin(@Body() dto: any) {
    return this.authService.createAdmin(dto);
  }
}
