import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UnavailableFeatureProps {
  title: string;
  description: string;
}

const UnavailableFeature = ({ title, description }: UnavailableFeatureProps) => (
  <div className="max-w-4xl mx-auto w-full space-y-8">
    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
    <Card className="bg-white/5 border-white/10 text-white rounded-3xl">
      <CardContent className="p-6 md:p-10 space-y-4">
        <Info className="text-gray-400" size={32} />
        <h2 className="text-xl font-semibold">Currently unavailable</h2>
        <p className="text-gray-400 leading-relaxed">{description}</p>
        <p className="text-sm text-gray-500">No sample data or simulated activity is shown.</p>
      </CardContent>
    </Card>
  </div>
);

export default UnavailableFeature;
