# NextAuth.js Setup for Beginners

## Step 1: Install NextAuth

Open your terminal and run:

```bash
npm install next-auth@beta
```

> Note: Use `@beta` for Next.js 15+ compatibility

---

## Step 2: Get Google Login Credentials

### 2.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 2.2 Create/Select Project

- Click on the project dropdown at the top
- Click "New Project" or select existing one

### 2.3 Enable Google+ API

- Go to "APIs & Services" > "Library"
- Search for "Google+ API"
- Click "Enable"

### 2.4 Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If asked, configure "OAuth consent screen":
   - Choose "External"
   - Fill in App name (e.g., "My Event App")
   - Add your email
   - Click "Save and Continue"
4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: "My App"
   - Authorized redirect URIs: Add these two:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000/auth/callback/google`
5. Click "Create"
6. **Copy your Client ID and Client Secret** (you'll need these!)

---

## Step 3: Add Environment Variables

Create a file named `.env.local` in your project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

### Generate NEXTAUTH_SECRET:

Run this in terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET`

**Important:** Never commit `.env.local` to Git! Add it to `.gitignore`

---

## Step 4: Create Auth Configuration

Create this folder structure:

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts
```

### Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

### Create `lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
```

### Email Password authentication:

```typescript

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { mongoConnect } from "@/lib/mongoConnect";

const handler = NextAuth({
session: {
strategy: "jwt",
},

providers: [
CredentialsProvider({
name: "Credentials",
credentials: {
email: { label: "Email", type: "email" },
password: { label: "Password", type: "password" },
},

     async authorize(credentials) {

       const {client, db} = await mongoConnect();

       if (!credentials?.email || !credentials?.password) {
         throw new Error("Missing credentials");
       }

       const user = await db.collections("users").findOne({credentials.email});

       if (!user) {
         throw new Error("User not found");
       }

       const isValid = await bcrypt.compare(
         credentials.password,
         user.password
       );

       if (!isValid) {
         throw new Error("Invalid password");
       }

       return {
         id: user.id,
         email: user.email,
         name: user.name,
       };
     },
   }),
],

callbacks: {
   async jwt({ token, user }) {
   if (user) {
   token.id = user.id;
   }
   return token;
   },

   async session({ session, token }) {
     if (token && session.user) {
       session.user.id = token.id as string;
     }
     return session;
   },
},

pages: {
signIn: "/login",
},
});

export { handler as GET, handler as POST };
```

That's it for basic setup! ✅

---

## Step 5: Wrap Your App with Session Provider

### Create `app/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### Update `app/layout.tsx`:

```typescript
import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Step 6: Create Login Button Component

### Create `components/LoginButton.tsx`:

```typescript
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const { data: session, status } = useSession();

  // Show loading state
  if (status === "loading") {
    return <Button disabled>Loading...</Button>;
  }

  // If user is logged in
  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">Hello, {session.user?.name}</span>
        <Button onClick={() => signOut()} variant="outline">
          Logout
        </Button>
      </div>
    );
  }

  // If user is NOT logged in
  return <Button onClick={() => signIn("google")}>Sign in with Google</Button>;
}
```

### Use it in your Header:

```typescript
import LoginButton from "@/components/LoginButton";

export default function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="font-bold text-xl">My App</div>
        <LoginButton />
      </div>
    </header>
  );
}
```

---

## Step 7: Protect Pages (Server Components)

### Create `lib/auth.ts`:

```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getServerSession();

  if (!session) {
    redirect("/"); // Redirect to home if not logged in
  }

  return session;
}
```

### Use it in protected pages like `app/dashboard/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await requireAuth(); // This protects the page

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-4">Welcome, {session.user?.name}!</p>
      <p className="text-sm text-gray-600">{session.user?.email}</p>
    </div>
  );
}
```

---

## Step 8: Get User Info in Any Server Component

```typescript
import { getServerSession } from "next-auth";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Name: {session.user?.name}</p>
      <p>Email: {session.user?.email}</p>
      <img src={session.user?.image || ""} alt="Profile" />
    </div>
  );
}
```

---

## Step 9: Get User Info in Client Components

```typescript
"use client";

import { useSession } from "next-auth/react";

export default function ClientProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Name: {session.user?.name}</p>
      <p>Email: {session.user?.email}</p>
    </div>
  );
}
```

---

## Step 10: Protect API Routes

### Create `app/api/protected/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "This is protected data",
    user: session.user,
  });
}
```

---

## Step 11: Create Custom Login Page (Optional)

### Create `app/login/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue to your account
          </p>
        </div>

        <Button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full"
          size="lg"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
```

---

## Quick Reference

### Check if user is logged in (Client Component):

```typescript
const { data: session } = useSession();
if (session) {
  // User is logged in
}
```

### Check if user is logged in (Server Component):

```typescript
const session = await getServerSession();
if (session) {
  // User is logged in
}
```

### Sign in:

```typescript
signIn("google");
```

### Sign out:

```typescript
signOut();
```

### Redirect after login:

```typescript
signIn("google", { callbackUrl: "/dashboard" });
```

---

## Testing Your Setup

1. Start your dev server:

   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click "Sign in with Google"

4. Complete Google login

5. You should be redirected back and see your name!

---

## Common Issues & Solutions

### ❌ "NEXTAUTH_SECRET is not set"

**Solution:** Make sure you added `NEXTAUTH_SECRET` to `.env.local`

### ❌ "Redirect URI mismatch"

**Solution:** Check your Google Console redirect URIs match exactly:

- `http://localhost:3000/api/auth/callback/google`

### ❌ Session is null

**Solution:** Make sure `<Providers>` wraps your app in `layout.tsx`

### ❌ "Module not found: next-auth"

**Solution:** Install it: `npm install next-auth@beta`
