import mongoose, { Schema, Document, Model } from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────
export interface IProjectFile {
  name: string;
  content: string;
  language: 'cpp' | 'json' | 'plaintext';
  readonly: boolean;
  updatedAt: Date;
}

export interface IDeviceInstance {
  instanceId: string;
  deviceType: string;
  label: string;
  config: Record<string, unknown>;
  pinMapping: Record<string, number>;
  values: Record<string, number>;
}

// ── Main interface ────────────────────────────────────────────────
export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  boardId: string;
  files: IProjectFile[];
  devices: IDeviceInstance[];
  tags: string[];
  isPublic: boolean;
  isFork: boolean;
  forkedFrom?: mongoose.Types.ObjectId;
  forkCount: number;
  starCount: number;
  lastOpenedAt: Date;
  compiledAt?: Date;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── File sub-schema ───────────────────────────────────────────────
const ProjectFileSchema = new Schema<IProjectFile>(
  {
    name: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    language: {
      type: String,
      enum: ['cpp', 'json', 'plaintext'],
      default: 'cpp',
    },
    readonly: { type: Boolean, default: false },
  },
  { _id: false, timestamps: { createdAt: false, updatedAt: true } }
);

// ── Device sub-schema ─────────────────────────────────────────────
const DeviceInstanceSchema = new Schema<IDeviceInstance>(
  {
    instanceId: { type: String, required: true },
    deviceType: { type: String, required: true },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    pinMapping: { type: Schema.Types.Mixed, default: {} },
    values: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

// ── Project schema ────────────────────────────────────────────────
const ProjectSchema = new Schema<IProject>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [80, 'Project name too long'],
    },
    description: { type: String, maxlength: [500, 'Description too long'] },
    boardId: { type: String, required: true, default: 'arduino-mega' },
    files: { type: [ProjectFileSchema], default: [] },
    devices: { type: [DeviceInstanceSchema], default: [] },
    tags: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
    isFork: { type: Boolean, default: false },
    forkedFrom: { type: Schema.Types.ObjectId, ref: 'Project' },
    forkCount: { type: Number, default: 0 },
    starCount: { type: Number, default: 0 },
    lastOpenedAt: { type: Date, default: Date.now },
    compiledAt: { type: Date },
    thumbnailUrl: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────
ProjectSchema.index({ owner: 1, updatedAt: -1 });
ProjectSchema.index({ owner: 1, name: 1 }, { unique: true });
ProjectSchema.index({ isPublic: 1, starCount: -1 });
ProjectSchema.index({ tags: 1 });

// ── Virtual: file count ───────────────────────────────────────────
ProjectSchema.virtual('fileCount').get(function () {
  return this.files.filter((f) => !f.name.startsWith('__')).length;
});

// ── Model ─────────────────────────────────────────────────────────
export const Project: Model<IProject> =
  mongoose.models.Project ?? mongoose.model<IProject>('Project', ProjectSchema);
