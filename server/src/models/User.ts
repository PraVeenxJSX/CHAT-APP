import mongoose, { Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  statusMessage?: string;
  dob?: string;
  showDob?: boolean;
  showOnlineStatus?: boolean;
  matchPassword(password: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    avatar: { type: String },
    statusMessage: { type: String, default: "" },
    dob: { type: String, default: "" },
    showDob: { type: Boolean, default: false },
    showOnlineStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (password: string) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
