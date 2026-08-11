import { supabase } from './supabase';

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export class TwoFactorAuth {
  static async enableTwoFactor(userId: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes(8);

    const { data: user } = await supabase
      .from('admin_users')
      .select('email')
      .eq('id', userId)
      .single();

    const qrCode = await this.generateQRCode(user?.email || '', secret);

    await supabase
      .from('admin_users')
      .update({
        two_factor_secret: secret,
        two_factor_backup_codes: backupCodes,
        two_factor_enabled: false,
      })
      .eq('id', userId);

    return { secret, qrCode, backupCodes };
  }

  static async verifyAndActivate(userId: string, code: string): Promise<boolean> {
    const { data: user } = await supabase
      .from('admin_users')
      .select('two_factor_secret')
      .eq('id', userId)
      .single();

    if (!user?.two_factor_secret) {
      throw new Error('2FA not set up');
    }

    const isValid = this.verifyTOTP(user.two_factor_secret, code);

    if (isValid) {
      await supabase
        .from('admin_users')
        .update({ two_factor_enabled: true })
        .eq('id', userId);
    }

    return isValid;
  }

  static async verify(userId: string, code: string): Promise<boolean> {
    const { data: user } = await supabase
      .from('admin_users')
      .select('two_factor_secret, two_factor_backup_codes, two_factor_enabled')
      .eq('id', userId)
      .single();

    if (!user?.two_factor_enabled || !user.two_factor_secret) {
      return false;
    }

    const isTOTPValid = this.verifyTOTP(user.two_factor_secret, code);
    if (isTOTPValid) return true;

    const backupCodes = user.two_factor_backup_codes || [];
    const backupCodeIndex = backupCodes.indexOf(code);

    if (backupCodeIndex !== -1) {
      const updatedCodes = backupCodes.filter((_, i) => i !== backupCodeIndex);
      await supabase
        .from('admin_users')
        .update({ two_factor_backup_codes: updatedCodes })
        .eq('id', userId);
      return true;
    }

    return false;
  }

  static async disable(userId: string, code: string): Promise<boolean> {
    const isValid = await this.verify(userId, code);

    if (isValid) {
      await supabase
        .from('admin_users')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_backup_codes: null,
        })
        .eq('id', userId);
    }

    return isValid;
  }

  static async regenerateBackupCodes(userId: string, code: string): Promise<string[] | null> {
    const isValid = await this.verify(userId, code);

    if (isValid) {
      const newBackupCodes = this.generateBackupCodes(8);
      await supabase
        .from('admin_users')
        .update({ two_factor_backup_codes: newBackupCodes })
        .eq('id', userId);
      return newBackupCodes;
    }

    return null;
  }

  private static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    for (let i = 0; i < 32; i++) {
      secret += chars[array[i] % chars.length];
    }

    return secret;
  }

  private static generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private static async generateQRCode(email: string, secret: string): Promise<string> {
    const issuer = 'TaxiAssur';
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    const qrSize = 200;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(otpauth)}`;

    return qrUrl;
  }

  private static verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    const time = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generateTOTP(secret, time + i);
      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  private static generateTOTP(secret: string, time: number): string {
    const key = this.base32Decode(secret);
    const epoch = Math.floor(time);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(epoch), false);

    return this.hmacSha1(key, new Uint8Array(buffer))
      .then(hmac => {
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = (
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff)
        ) % 1000000;
        return code.toString().padStart(6, '0');
      });
  }

  private static base32Decode(input: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanedInput = input.replace(/=+$/, '').toUpperCase();
    const bits: number[] = [];

    for (let i = 0; i < cleanedInput.length; i++) {
      const val = alphabet.indexOf(cleanedInput[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits.push(val);
    }

    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const chunk = bits.slice(i, i + 8);
      let bitString = '';
      for (const bit of chunk) {
        bitString += bit.toString(2).padStart(5, '0');
      }

      for (let j = 0; j < bitString.length; j += 8) {
        const byte = bitString.substr(j, 8);
        if (byte.length === 8) {
          bytes.push(parseInt(byte, 2));
        }
      }
    }

    return new Uint8Array(bytes);
  }

  private static async hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
  }
}
