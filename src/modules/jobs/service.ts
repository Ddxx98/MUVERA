import mongoose from 'mongoose';
import { JobModel, IJob } from './model';
import { logger } from '@/lib/logger';
import { connectToMongo } from '@/lib/db';

const LEASE_MS = 60_000;

interface InMemoryJob {
  _id: string;
  type: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  runAt: Date;
  lockedUntil?: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  var _muveraJobs: InMemoryJob[] | undefined;
}

if (!global._muveraJobs) {
  global._muveraJobs = [];
}

async function isDbConnected(): Promise<boolean> {
  if (mongoose.connection && mongoose.connection.readyState === 1) return true;
  return await connectToMongo();
}

export const jobService = {
  /**
   * Enqueues a job for background processing with optional deduplication.
   */
  async enqueueJob(
    type: string,
    payload: Record<string, unknown> = {},
    options: { runAt?: Date; dedupeKey?: string; maxAttempts?: number } = {}
  ): Promise<{ id: string }> {
    const runAt = options.runAt || new Date();
    const maxAttempts = options.maxAttempts || 3;

    if (await isDbConnected()) {
      try {
        if (options.dedupeKey) {
          const existing = await JobModel.findOne({ dedupeKey: options.dedupeKey, status: { $in: ['pending', 'running'] } });
          if (existing) {
            return { id: existing._id.toString() };
          }
        }
        const created = await JobModel.create({
          type,
          payload,
          dedupeKey: options.dedupeKey,
          status: 'pending',
          runAt,
          maxAttempts,
          attempts: 0,
        });
        return { id: created._id.toString() };
      } catch (err) {
        logger.warn('Failed to enqueue job in MongoDB, using in-memory queue', { err: String(err) });
      }
    }

    if (options.dedupeKey) {
      const existing = global._muveraJobs!.find(
        (j) => j.dedupeKey === options.dedupeKey && ['pending', 'running'].includes(j.status)
      );
      if (existing) return { id: existing._id };
    }

    const newJob: InMemoryJob = {
      _id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      dedupeKey: options.dedupeKey,
      status: 'pending',
      runAt,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    global._muveraJobs!.push(newJob);
    return { id: newJob._id };
  },

  /**
   * Claims next pending job atomically using MongoDB findOneAndUpdate or in-memory lock.
   */
  async claimJob(now = new Date()): Promise<IJob | InMemoryJob | null> {
    if (await isDbConnected()) {
      try {
        const job = await JobModel.findOneAndUpdate(
          {
            status: 'pending',
            runAt: { $lte: now },
          },
          {
            $set: {
              status: 'running',
              lockedUntil: new Date(now.getTime() + LEASE_MS),
            },
            $inc: { attempts: 1 },
          },
          { sort: { runAt: 1 }, new: true }
        );
        if (job) return job;
      } catch (err) {
        logger.warn('Job claim in Mongo failed, falling back to memory queue', { err: String(err) });
      }
    }

    const available = global._muveraJobs!.find(
      (j) => j.status === 'pending' && j.runAt <= now
    );
    if (!available) return null;

    available.status = 'running';
    available.lockedUntil = new Date(now.getTime() + LEASE_MS);
    available.attempts += 1;
    available.updatedAt = new Date();
    return available;
  },

  /**
   * Recovers jobs whose leases expired while status was 'running' (e.g. serverless crash).
   */
  async recoverExpiredLeases(now = new Date()): Promise<number> {
    let recoveredCount = 0;
    if (await isDbConnected()) {
      try {
        const res = await JobModel.updateMany(
          {
            status: 'running',
            lockedUntil: { $lte: now },
          },
          {
            $set: { status: 'pending' },
          }
        );
        recoveredCount += res.modifiedCount;
      } catch (err) {
        logger.warn('Failed recovering expired leases in Mongo', { err: String(err) });
      }
    }

    for (const j of global._muveraJobs!) {
      if (j.status === 'running' && j.lockedUntil && j.lockedUntil <= now) {
        j.status = 'pending';
        j.lockedUntil = undefined;
        recoveredCount += 1;
      }
    }

    return recoveredCount;
  },

  /**
   * Marks a job completed.
   */
  async completeJob(jobId: string): Promise<void> {
    if (await isDbConnected()) {
      try {
        await JobModel.updateOne({ _id: jobId }, { $set: { status: 'completed' } });
      } catch (err) {
        logger.warn('Failed completing job in Mongo', { err: String(err) });
      }
    }
    const memJob = global._muveraJobs!.find((j) => j._id === jobId);
    if (memJob) {
      memJob.status = 'completed';
      memJob.updatedAt = new Date();
    }
  },

  /**
   * Fails a job with exponential backoff or marks it permanently failed if max attempts reached.
   */
  async failJob(
    jobId: string,
    attempts: number,
    maxAttempts: number,
    err: unknown,
    now = new Date()
  ): Promise<void> {
    const exhausted = attempts >= maxAttempts;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const nextRunAt = new Date(now.getTime() + Math.pow(2, attempts) * 30_000);

    if (await isDbConnected()) {
      try {
        await JobModel.updateOne(
          { _id: jobId },
          {
            $set: exhausted
              ? { status: 'failed', lastError: errorMessage }
              : { status: 'pending', runAt: nextRunAt, lastError: errorMessage },
          }
        );
      } catch (e) {
        logger.warn('Failed marking job failed in Mongo', { err: String(e) });
      }
    }

    const memJob = global._muveraJobs!.find((j) => j._id === jobId);
    if (memJob) {
      memJob.lastError = errorMessage;
      memJob.status = exhausted ? 'failed' : 'pending';
      if (!exhausted) {
        memJob.runAt = nextRunAt;
      }
      memJob.updatedAt = new Date();
    }
  },
};
