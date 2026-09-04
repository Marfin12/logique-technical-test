import type {
  MasterProfileDto,
  MasterProfileResponseDto,
} from "@insurance/contracts";

import { requireRole, type Principal } from "../domain/authorization.js";
import { moneyToDto, toIsoDate } from "../domain/money.js";
import {
  parseProfileInput,
  type ValidProfileInput,
} from "../domain/profile.js";
import type { MasterProfileDocument } from "../models/persistence.js";

export interface ProfileStore {
  findByUserId(userId: string): Promise<MasterProfileDocument | null>;
  save(
    userId: string,
    input: ValidProfileInput,
  ): Promise<MasterProfileDocument>;
}

function toDto(profile: MasterProfileDocument): MasterProfileDto {
  return {
    age: profile.age,
    sumAssured: moneyToDto({
      amount: profile.sumAssured,
      currency: profile.currency,
    }),
    paymentFrequency: profile.paymentFrequency,
    paymentMethod: profile.paymentMethod,
    version: profile.version,
    updatedAt: toIsoDate(profile.updatedAt),
  };
}

export class ProfileService {
  constructor(private readonly profiles: ProfileStore) {}

  async getOwn(principal: Principal): Promise<MasterProfileResponseDto> {
    requireRole(principal, ["USER"]);
    const profile = await this.profiles.findByUserId(principal.id);
    return { profile: profile ? toDto(profile) : null };
  }

  async saveOwn(
    principal: Principal,
    value: unknown,
  ): Promise<MasterProfileResponseDto> {
    requireRole(principal, ["USER"]);
    const input = parseProfileInput(value);
    const profile = await this.profiles.save(principal.id, input);
    return { profile: toDto(profile) };
  }
}
