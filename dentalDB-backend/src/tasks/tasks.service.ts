import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private repo: Repository<Task>,
  ) {}

  async create(clinicId: string, userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.repo.create({
      ...dto,
      clinicId,
      createdByUserId: userId,
      status: TaskStatus.PENDING,
    });
    return this.repo.save(task);
  }

  async findAll(clinicId: string, query: any): Promise<{ data: Task[]; total: number }> {
    const { status, assignedToUserId, assignedToBranchId, page = 1, limit = 50 } = query;

    let qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedToUser', 'u')
      .leftJoinAndSelect('t.assignedToBranch', 'b')
      .where('t.clinicId = :clinicId', { clinicId });

    if (status) qb = qb.andWhere('t.status = :status', { status });
    if (assignedToUserId) qb = qb.andWhere('t.assignedToUserId = :assignedToUserId', { assignedToUserId });
    if (assignedToBranchId) qb = qb.andWhere('t.assignedToBranchId = :assignedToBranchId', { assignedToBranchId });

    qb = qb.orderBy('t.createdAt', 'DESC');

    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total };
  }

  async findMyTasks(clinicId: string, userId: string, branchId?: string): Promise<Task[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedToUser', 'u')
      .leftJoinAndSelect('t.assignedToBranch', 'b')
      .where('t.clinicId = :clinicId', { clinicId })
      .andWhere('t.status NOT IN (:...done)', { done: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] });

    if (branchId) {
      qb.andWhere(
        '(t.assignedToUserId = :userId OR t.assignedToBranchId = :branchId)',
        { userId, branchId },
      );
    } else {
      qb.andWhere('t.assignedToUserId = :userId', { userId });
    }

    return qb.orderBy('t.dueDate', 'ASC', 'NULLS LAST').addOrderBy('t.createdAt', 'DESC').getMany();
  }

  async findOne(clinicId: string, id: string): Promise<Task> {
    const task = await this.repo.findOne({
      where: { id, clinicId },
      relations: ['assignedToUser', 'assignedToBranch', 'createdBy'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(clinicId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOne(clinicId, id);
    await this.repo.update({ id, clinicId }, dto as any);
    return this.findOne(clinicId, id);
  }

  async updateStatus(clinicId: string, id: string, status: TaskStatus, note?: string): Promise<Task> {
    await this.findOne(clinicId, id);
    const update: any = { status };
    if (note) update.completionNote = note;
    await this.repo.update({ id, clinicId }, update);
    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }

  async getStats(clinicId: string) {
    const [total, pending, ongoing, completed, cancelled] = await Promise.all([
      this.repo.count({ where: { clinicId } }),
      this.repo.count({ where: { clinicId, status: TaskStatus.PENDING } }),
      this.repo.count({ where: { clinicId, status: TaskStatus.ONGOING } }),
      this.repo.count({ where: { clinicId, status: TaskStatus.COMPLETED } }),
      this.repo.count({ where: { clinicId, status: TaskStatus.CANCELLED } }),
    ]);
    return { total, pending, ongoing, completed, cancelled };
  }
}
