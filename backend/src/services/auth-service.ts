import type {
  AccountDto,
  LoginRequestDto,
  LoginResponseDto,
  Role,
} from "@insurance/contracts";

import { normalizeEmail, verifyPassword } from "../domain/credentials.js";
import { UnauthorizedError, ValidationError } from "../domain/errors.js";
import type { UserDocument } from "../models/persistence.js";

const DUMMY_HASH = [
  "scrypt",
  "16384",
  "8",
  "1",
  Buffer.alloc(16).toString("base64url"),
  Buffer.alloc(64).toString("base64url"),
].join("$");

export interface AuthUserStore {
  findByEmail(normalizedEmail: string): Promise<UserDocument | null>;
  findById(id: string): Promise<UserDocument | null>;
}

export interface ProfileLookup {
  findByUserId(userId: string): Promise<unknown | null>;
}

export function parseLoginInput(value: unknown): LoginRequestDto {
  const input = value as Partial<LoginRequestDto> | null;
  if (
    !input ||
    typeof input.email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(input.email.trim()) ||
    typeof input.password !== "string" ||
    input.password.length < 1 ||
    input.password.length > 256
  ) {
    throw new ValidationError("Email and password are required.");
  }
  return { email: input.email, password: input.password };
}

export function destinationFor(role: Role, profileComplete: boolean) {
  if (role === "ADMIN") return "/admin/applications" as const;
  return profileComplete ? ("/products" as const) : ("/profile/setup" as const);
}

export class AuthService {
  constructor(
    private readonly users: AuthUserStore,
    private readonly profiles: ProfileLookup,
  ) {}

  async login(input: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedError("Invalid email or password.");
    }
    const account = await this.toAccount(user);
    return {
      account,
      nextPath: destinationFor(account.role, account.profileComplete),
    };
  }

  async currentAccount(id: string): Promise<AccountDto> {
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedError();
    return this.toAccount(user);
  }

  private async toAccount(user: UserDocument): Promise<AccountDto> {
    const profileComplete =
      user.role === "USER" &&
      Boolean(await this.profiles.findByUserId(user._id.toHexString()));
    return {
      id: user._id.toHexString(),
      displayName: user.displayName,
      role: user.role,
      profileComplete,
    };
  }
}
