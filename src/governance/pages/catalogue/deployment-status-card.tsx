import { formatDate } from '@/governance/lib/format';
import { Card } from '@/governance/ui';
import { StatusDot } from './badges';

const EYEBROW = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

export function DeploymentStatusCard({
  pipelineHealth,
  lastDeployment,
  schemaChange,
}: {
  pipelineHealth: string;
  lastDeployment: string;
  schemaChange: string;
}) {
  return (
    <Card.Root className="mb-4">
      <Card.Header>
        <span className={EYEBROW}>Deployment status</span>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Pipeline</div>
            <StatusDot label={pipelineHealth} className="mt-0.5 text-sm font-medium" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last deployment</div>
            <div className="mt-0.5 text-sm font-medium">{formatDate(lastDeployment)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Schema change</div>
            <div className="mt-0.5 text-sm font-medium">{formatDate(schemaChange)}</div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
