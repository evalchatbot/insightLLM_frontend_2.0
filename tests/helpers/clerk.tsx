import React from "react";
import { vi } from "vitest";

/**
 * Controllable stand-ins for `@clerk/nextjs` (client) and `@clerk/nextjs/server`.
 *
 * Usage in a test file:
 *   vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
 *   vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
 *
 * State and spies live on globalThis so they stay shared even when a test calls
 * vi.resetModules() and this helper gets evaluated a second time.
 */

export type FakeUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string;
};

function createStore() {
  const serverState = {
    userId: null as string | null,
    /** Email returned by clerkClient().users.getUser(); null = user has no email. */
    email: "student@example.com" as string | null,
    /** When set, clerkClient().users.getUser() rejects with this error. */
    getUserError: null as Error | null,
  };
  const getUser = vi.fn(async (userId: string) => {
    if (serverState.getUserError) throw serverState.getUserError;
    return { id: userId, emailAddresses: serverState.email ? [{ emailAddress: serverState.email }] : [] };
  });
  return {
    clerkState: {
      user: null as FakeUser | null,
      isLoaded: true,
      openSignIn: vi.fn(),
      signOut: vi.fn(),
    },
    serverState,
    getUser,
    getAuth: vi.fn<(req?: unknown) => { userId: string | null }>(() => ({ userId: serverState.userId })),
    auth: vi.fn(async () => ({ userId: serverState.userId })),
    currentUser: vi.fn(async () =>
      serverState.userId
        ? { id: serverState.userId, emailAddresses: serverState.email ? [{ emailAddress: serverState.email }] : [] }
        : null
    ),
    clerkClient: vi.fn(async () => ({ users: { getUser } })),
  };
}

type Store = ReturnType<typeof createStore>;
const g = globalThis as unknown as { __clerkTestStore?: Store };
const store: Store = (g.__clerkTestStore ??= createStore());

export const { clerkState, serverState, getUser, getAuth, auth, currentUser, clerkClient } = store;

export function signInAs(overrides: Partial<FakeUser> = {}): FakeUser {
  const email = overrides.primaryEmailAddress?.emailAddress ?? "student@example.com";
  const user: FakeUser = {
    id: "user_test_123",
    firstName: "Test",
    lastName: "Student",
    primaryEmailAddress: { emailAddress: email },
    emailAddresses: [{ emailAddress: email }],
    ...overrides,
  };
  clerkState.user = user;
  return user;
}

export function resetClerk() {
  clerkState.user = null;
  clerkState.isLoaded = true;
  clerkState.openSignIn.mockReset();
  clerkState.signOut.mockReset();
}

export function resetServerClerk() {
  serverState.userId = null;
  serverState.email = "student@example.com";
  serverState.getUserError = null;
  for (const fn of [getUser, getAuth, auth, currentUser, clerkClient]) fn.mockClear();
}

/**
 * Mirrors the real `<SignInButton>` (@clerk/clerk-react 5.x): it clones its
 * single child and attaches an onClick that opens the sign-in modal. Like the
 * real component it adds no class names or wrapper elements.
 */
function SignInButton({ children }: { children?: React.ReactNode; mode?: string }) {
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    onClick: async (event: any) => {
      await child.props.onClick?.(event);
      clerkState.openSignIn();
    },
  });
}

function SignOutButton({ children }: { children?: React.ReactNode }) {
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    onClick: async (event: any) => {
      await child.props.onClick?.(event);
      clerkState.signOut();
    },
  });
}

export const clerkClientModule = {
  useUser: () => ({
    user: clerkState.user,
    isLoaded: clerkState.isLoaded,
    isSignedIn: clerkState.isLoaded ? Boolean(clerkState.user) : undefined,
  }),
  useAuth: () => ({
    userId: clerkState.user?.id ?? null,
    isLoaded: clerkState.isLoaded,
    isSignedIn: Boolean(clerkState.user),
    getToken: async () => null,
  }),
  useClerk: () => ({ openSignIn: clerkState.openSignIn, signOut: clerkState.signOut }),
  SignInButton,
  SignUpButton: SignInButton,
  SignOutButton,
  SignedIn: ({ children }: { children?: React.ReactNode }) => (clerkState.user ? <>{children}</> : null),
  SignedOut: ({ children }: { children?: React.ReactNode }) => (clerkState.user ? null : <>{children}</>),
  UserButton: () => <div data-testid="clerk-user-button" />,
  ClerkProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

export const clerkServerModule = { getAuth, auth, currentUser, clerkClient };
