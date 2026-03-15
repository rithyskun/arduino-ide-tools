import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Interface ────────────────────────────────────────────────────
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    defaultBoard: string;
    editorFontSize: number;
    editorTheme: string;
    autoSave: boolean;
  };
  stats: {
    projectCount: number;
    lastActiveAt: Date;
    joinedAt: Date;
  };
  emailVerified: boolean;
  isActive: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(plain: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  preferences: IUser['preferences'];
  stats: IUser['stats'];
  role: string;
  createdAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [24, 'Username must be at most 24 characters'],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, _ and -',
      ],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned in queries by default
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name too long'],
      default: function (this: IUser) {
        return this.username;
      },
    },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: [300, 'Bio too long'] },

    preferences: {
      defaultBoard: { type: String, default: 'arduino-mega' },
      editorFontSize: { type: Number, default: 13, min: 10, max: 24 },
      editorTheme: { type: String, default: 'arduino-dark' },
      autoSave: { type: Boolean, default: true },
    },

    stats: {
      projectCount: { type: Number, default: 0 },
      lastActiveAt: { type: Date, default: Date.now },
      joinedAt: { type: Date, default: Date.now },
    },

    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ 'stats.lastActiveAt': -1 });

// ── Pre-save: hash password ───────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Methods ───────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  plain: string
): Promise<boolean> {
  // passwordHash is excluded by default — caller must explicitly select it
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function (): PublicUser {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    preferences: this.preferences,
    stats: this.stats,
    role: this.role,
    createdAt: this.createdAt,
  };
};

// ── Model (singleton-safe in Next.js HMR) ─────────────────────────
export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
