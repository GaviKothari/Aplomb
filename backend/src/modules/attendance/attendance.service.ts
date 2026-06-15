import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

const EARTH_RADIUS_M = 6371000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async punchIn(userId: string, lat: number, lng: number) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    const employeeId = emp?.id || userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId, date: { gte: today } },
    });
    if (existing?.punchInAt) throw new BadRequestException('Already punched in today');

    // Find nearest office
    const offices = await this.prisma.officeLocation.findMany({ where: { isActive: true } });
    let nearestOffice = null;
    let minDistance = Infinity;

    for (const office of offices) {
      const dist = haversineDistance(lat, lng, Number(office.latitude), Number(office.longitude));
      if (dist < minDistance) {
        minDistance = dist;
        nearestOffice = office;
      }
    }

    const isWithinGeofence = nearestOffice ? minDistance <= nearestOffice.radiusMeters : false;

    const record = await this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: {
        punchInAt: new Date(),
        punchInLatitude: lat,
        punchInLongitude: lng,
        officeLocationId: nearestOffice?.id,
        distanceFromOffice: minDistance,
        isWithinGeofence,
        status: AttendanceStatus.PRESENT,
      },
      create: {
        employeeId,
        date: today,
        punchInAt: new Date(),
        punchInLatitude: lat,
        punchInLongitude: lng,
        officeLocationId: nearestOffice?.id,
        distanceFromOffice: minDistance,
        isWithinGeofence,
        status: AttendanceStatus.PRESENT,
      },
    });

    return { record, distanceFromOffice: Math.round(minDistance), isWithinGeofence };
  }

  async punchOut(userId: string, lat: number, lng: number) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    const employeeId = emp?.id || userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId, date: { gte: today } },
    });
    if (!record) throw new BadRequestException('No punch-in record found for today');
    if (record.punchOutAt) throw new BadRequestException('Already punched out today');

    const workHours = record.punchInAt
      ? (Date.now() - record.punchInAt.getTime()) / 3600000
      : 0;

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        punchOutAt: new Date(),
        punchOutLatitude: lat,
        punchOutLongitude: lng,
        workHours: parseFloat(workHours.toFixed(2)),
      },
    });
  }

  async getTodayRecord(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    const employeeId = emp?.id || userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.attendanceRecord.findFirst({
      where: { employeeId, date: { gte: today } },
      include: { officeLocation: true },
    });
  }

  async findAll(query: { employeeId?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const { employeeId, from, to, page = 1, limit = 31 } = query;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: { include: { user: { select: { name: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async override(recordId: string, status: AttendanceStatus, reason: string, adminId: string) {
    return this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { status, overrideReason: reason, markedById: adminId },
    });
  }
}
