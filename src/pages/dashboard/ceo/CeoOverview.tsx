import CEOControlTower from './CEOControlTower';

const CeoOverview: React.FC = () => {
    // We are delegating the overview logic to the comprehensive CEOControlTower component
    // which contains the "Financial Control Tower" features.
    return (
        <div className="animate-in fade-in duration-500">
            <CEOControlTower />
        </div>
    );
};

export default CeoOverview;
