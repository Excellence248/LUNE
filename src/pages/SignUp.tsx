import AccountForm from '@/components/auth/AccountForm';
import AuthShell from '@/components/auth/AuthShell';

const SignUp = () => (
  <AuthShell title="Create your account" description="Your next conversation starts here. Join with your email—no wallet required.">
    <AccountForm view="sign_up" />
  </AuthShell>
);

export default SignUp;
