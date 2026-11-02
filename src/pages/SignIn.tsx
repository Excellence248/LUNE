import AccountForm from '@/components/auth/AccountForm';
import AuthShell from '@/components/auth/AuthShell';

const SignIn = () => (
  <AuthShell title="Welcome back" description="Sign in to your Lune account to catch up, connect, and join the conversation.">
    <AccountForm view="sign_in" />
  </AuthShell>
);

export default SignIn;
