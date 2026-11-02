# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

# Accounts

- SessionContextProvider owns Supabase sessions and personal profiles; WalletProvider adds optional wallet sign-in.
- Email/password signup and login use /signup and /signin. Email callbacks use /auth/callback; password recovery uses /reset-password.
- Profiles are created automatically at signup and restored with ensure_user_profile. wallet_address is nullable; email addresses stay out of public profiles.
- Authenticated email and wallet accounts can use the social feed. Keep owner-only RLS and storage-folder ownership; do not reinstate wallet-only social permissions.
- The feed, posts, and public profiles remain readable by guests. Personal profiles and notifications require authentication.
