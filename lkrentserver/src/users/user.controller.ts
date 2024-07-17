import { Controller, Post, Get, Body, Put, Headers, Param, UploadedFile, UseInterceptors, UnauthorizedException, HttpStatus, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UserInfoDto } from './dto/user-info.dto';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiBody({ type: CreateUserDto })
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.userService.create(createUserDto);
      const token = await this.userService.generateToken(user);
      return { user, token };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta as { target: string[] }).target;
        if (target.includes('phoneNumber')) {
          throw new HttpException(
            'Số điện thoại đã tồn tại',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiBody({ type: LoginUserDto })
  async login(@Body() loginUserDto: LoginUserDto) {
    const user = await this.userService.validateUser(loginUserDto);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const token = await this.userService.generateToken(user);
    return { user, token };
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Param('id') userId: number,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateProfile(Number(userId), updateUserProfileDto, file);
  }

  @Get('info')
  @ApiOperation({ summary: 'Get user information from token' })
  @ApiResponse({ status: 200, description: 'User information retrieved.', type: UserInfoDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getUserInfo(@Headers('Authorization') authHeader: string): Promise<UserInfoDto> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { valid, decoded } = await this.userService.validateToken(token);
    if (!valid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = decoded.sub; // Ensure this matches your JWT payload structure

    const user = await this.userService.getUserInfo(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      email: user.email,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      drivingLicenseUrl: user.drivingLicenseUrl,
      numberOfSuccessRentals: user.numberOfSuccessRentals,
      rewardPoints: user.rewardPoints,
      drivingLicenseVerified: user.drivingLicenseVerified,
      emailVerified: user.emailVerified,
      phoneNumberVerified: user.phoneNumberVerified,
      ownerRating: user.ownerRating,
      ownerTrips: user.ownerTrips,
      ownerBadgeText: user.ownerBadgeText,
      ownerResponseRate: user.ownerResponseRate,
      ownerApprovalRate: user.ownerApprovalRate,
      ownerResponseTime: user.ownerResponseTime,
    };
  }

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for email verification' })
  @ApiResponse({ status: 201, description: 'OTP successfully sent.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiBody({ type: RequestOtpDto })
  async requestOtp(@Headers('Authorization') authHeader: string, @Body() requestOtpDto: RequestOtpDto) {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { valid, decoded } = await this.userService.validateToken(token);
    if (!valid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = decoded.sub; // Ensure this matches your JWT payload structure

    try {
      return await this.userService.requestOtp(requestOtpDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP for email' })
  @ApiResponse({ status: 200, description: 'OTP successfully verified.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Headers('Authorization') authHeader: string, @Body() verifyOtpDto: VerifyOtpDto) {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { valid, decoded } = await this.userService.validateToken(token);
    if (!valid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = decoded.sub; // Ensure this matches your JWT payload structure

    try {
      return await this.userService.verifyOtp(verifyOtpDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
