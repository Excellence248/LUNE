import { useEffect } from 'react';
import { backgroundCss, useAppearance } from '@/lib/appearance';

/**
 * The member's own app background, behind everything. With the default choice it renders nothing and
 * the usual deep-space look shows; with a preset or picture it sits under the stars, which are dimmed
 * so the picture can be seen.
 */
const AppBackground = () => {
  const { app, appDim } = useAppearance();
  const css = app.kind === 'default' ? null : backgroundCss(app);

  useEffect(() => {
    const root = document.documentElement;
    if (css) root.setAttribute('data-custom-bg', '');
    else root.removeAttribute('data-custom-bg');
    return () => root.removeAttribute('data-custom-bg');
  }, [css]);

  if (!css) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[2]" style={{ background: css }}>
      <div className="absolute inset-0 bg-black" style={{ opacity: appDim }} />
    </div>
  );
};

export default AppBackground;
