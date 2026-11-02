import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppWrapper } from "./components/lune/AppWrapper";
import RequireAccount from "./components/auth/RequireAccount";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import EmailLink from "./pages/EmailLink";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import Launchpad from "./pages/Launchpad";
import LaunchpadDetail from "./pages/LaunchpadDetail";
import Spaces from "./pages/Spaces";
import LiveSpace from "./pages/LiveSpace";
import Wallet from "./pages/Wallet";
import Jobs from "./pages/Jobs";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
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
import NotFound from "./pages/NotFound";

const App = () => (
  <AppWrapper>
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<Login />} />
        <Route path="/signup" element={<Login view="sign_up" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<EmailLink purpose="recovery" />} />
        <Route path="/confirm-email" element={<EmailLink purpose="confirmation" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Index />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/token/:symbol" element={<TokenDetail />} />
        <Route path="/launchpad" element={<Launchpad />} />
        <Route path="/launchpad/:id" element={<LaunchpadDetail />} />
        <Route path="/degen-tools" element={<DegenTools />} />
        <Route path="/staking" element={<Staking />} />
        <Route path="/spaces" element={<Spaces />} />
        <Route path="/spaces/:id" element={<LiveSpace />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/profile" element={<RequireAccount><Profile /></RequireAccount>} />
        <Route path="/profile/:username" element={<UserProfile />} />
        <Route path="/trade/:symbol" element={<Trade />} />
        <Route path="/demo-trade" element={<DemoTrade />} />
        <Route path="/nfts" element={<NFTs />} />
        <Route path="/live-auction" element={<LiveAuction />} />
        <Route path="/notifications" element={<RequireAccount><Notifications /></RequireAccount>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppWrapper>
);

export default App;
