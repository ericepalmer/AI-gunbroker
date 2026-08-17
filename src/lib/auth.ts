import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { emailShell, sendEmail } from "@/lib/email";

export const auth = betterAuth({
  appName: "Chamber",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      void sendEmail({
        to: user.email,
        subject: "Reset your Chamber password",
        text: `Reset your password: ${resetUrl}`,
        html: emailShell(
          "Reset your password",
          "Use this link to choose a new password for your Chamber account. It expires in one hour.",
          resetUrl,
          "Choose a new password",
        ),
      });
    },
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your Chamber email",
        text: `Verify your email: ${url}`,
        html: emailShell(
          "Confirm your email",
          "Thanks for creating a Chamber account. Confirm this address so you can list, track, and ship from GunBroker without rebuilding auctions by hand.",
          url,
          "Verify email",
        ),
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        void sendEmail({
          to: newEmail,
          subject: "Confirm your new Chamber email",
          text: `Confirm this email change for ${user.email}: ${url}`,
          html: emailShell(
            "Confirm your new email",
            `This updates the login email on the Chamber account currently using ${user.email}.`,
            url,
            "Confirm email change",
          ),
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "Confirm Chamber account deletion",
          text: `Delete your Chamber account: ${url}`,
          html: emailShell(
            "Delete your account?",
            "This permanently removes your Chamber login. Integration settings will go with it. Listings already on GunBroker are not deleted from GunBroker itself.",
            url,
            "Yes, delete my account",
          ),
        });
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
