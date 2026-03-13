import jwt from "jsonwebtoken";

export const generateToken = (id: string, name: string, email: string) => {
  return jwt.sign({ id, name, email }, process.env.JWT_SECRET as string, {
    expiresIn: "7d"
  });
};
