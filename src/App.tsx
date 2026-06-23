import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppWrapper } from "./components/lune/AppWrapper";
import { useWallet } from "./context/WalletContext";
import Index from "./pages/Index";
import Launchpad from "./pages/Launchpad";
import LaunchpadDetail from "./pages/LaunchpadDetail";
import Spaces from "./pages/Spaces";
import LiveSpace from "./pages/LiveSpace";
import Wallet from "./pages/Wallet";
import Jobs from "./pages/Jobs";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import Trade from "./pages/Trade";
import DemoTrade from "./pages/DemoTrade";
import NFTs from "./pages/NFTs";
import LiveAuction from "./pages/LiveAuction";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Governance from "./pages/Governance";
import Messages from "./pages/Messages";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import Bridge from "./pages/Bridge";
import Referrals from "./pages/Referrals";
import Explorer from "./pages/Explorer";
import Analytics from "./pages/Analytics";
import DegenTools from "./pages/DegenTools";
import Staking from "./pages/Staking";
import TokenDetail from "./pages/TokenDetail";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useWallet();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <AppWrapper>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/explorer" element={<ProtectedRoute><Explorer /></ProtectedRoute>} />
        <Route path="/token/:symbol" element={<ProtectedRoute><TokenDetail /></ProtectedRoute>} />
        <Route path="/launchpad" element={<ProtectedRoute><Launchpad /></ProtectedRoute>} />
        <Route path="/launchpad/:id" element={<ProtectedRoute><LaunchpadDetail /></ProtectedRoute>} />
        <Route path="/degen-tools" element={<ProtectedRoute><DegenTools /></ProtectedRoute>} />
        <Route path="/staking" element={<ProtectedRoute><Staking /></ProtectedRoute>} />
        <Route path="/spaces" element={<ProtectedRoute><Spaces /></ProtectedRoute>} />
        <Route path="/spaces/:id" element={<ProtectedRoute><LiveSpace /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
        <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/trade/:symbol" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
        <Route path="/demo-trade" element={<ProtectedRoute><DemoTrade /></ProtectedRoute>} />
        <Route path="/nfts" element={<ProtectedRoute><NFTs /></ProtectedRoute>} />
        <Route path="/live-auction" element={<ProtectedRoute><LiveAuction /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
        <Route path="/bridge" element={<ProtectedRoute><Bridge /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppWrapper>
);

export default App;