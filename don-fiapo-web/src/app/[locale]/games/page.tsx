import { FC, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Dog, Smile } from 'lucide-react';
import { Link } from '@/lib/navigation';

const GameCard: FC<{ title: string; description: string; isMultiplayer: boolean; comingSoon?: boolean; href?: string; icon: ReactNode; }> = ({ title, description, isMultiplayer, comingSoon, href, icon }) => {
  const t = useTranslations('Games');

  const cardClasses = `
    bg-card/80 backdrop-blur-sm border border-golden/20 rounded-xl p-6 flex flex-col items-center text-center relative h-full 
    transition-all duration-300 group 
    ${comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:border-golden/50 hover:shadow-2xl hover:shadow-golden/10 hover:-translate-y-2'}
  `;

  const content = (
    <div className={cardClasses}>
      {comingSoon && (
        <div className="absolute top-3 right-3 bg-red-600/80 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">{t('comingSoon')}</div>
      )}
      <div className="mb-4 text-golden transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-2xl font-bold font-display text-golden mb-2">{title}</h3>
      <p className="text-foreground/70 mb-4 flex-grow text-sm">{description}</p>
      <div className={`font-semibold text-xs px-3 py-1 rounded-full ${isMultiplayer ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
        {isMultiplayer ? t('multiplayer') : t('singlePlayer')}
      </div>
    </div>
  );

  if (comingSoon || !href) {
    return content;
  }

  return <Link href={href as any} className="block">{content}</Link>;
};

const GamesPage: FC = () => {
  const t = useTranslations('Games');

  return (
    <div className="relative overflow-hidden py-24">
      <div 
        className="absolute inset-0 bg-repeat bg-center opacity-5"
        style={{ backgroundImage: 'url(/images/hero-bg.png)' }}
      />
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold font-display text-golden drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{t('title')}</h1>
          <p className="text-lg text-foreground/80 mt-3 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <GameCard 
            title={t('spin.title')}
            description={t('spin.description')}
            isMultiplayer={false}
            href="/games/spin"
            icon={<Target className="w-12 h-12" />}
          />
          <GameCard 
            title={t('tug.title')}
            description={t('tug.description')}
            isMultiplayer={true}
            comingSoon
            icon={<Dog className="w-12 h-12" />}
          />
          <GameCard 
            title={t('meme.title')}
            description={t('meme.description')}
            isMultiplayer={true}
            comingSoon
            icon={<Smile className="w-12 h-12" />}
          />
        </div>
      </div>
    </div>
  );
};

export default GamesPage;
