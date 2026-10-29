import type { Bag } from "./engine";
import { Icon } from "./Icon";
export function ResourceName({ name }: { name: string }) {
  return (
    <span className={"resource-name " + name}>
      <Icon name={name} />
      <span>{name}</span>
    </span>
  );
}
export function ResourceAmounts({ amounts }: { amounts: Bag }) {
  return (
    <span className="resource-amounts">
      {Object.entries(amounts)
        .filter(([, value]) => value)
        .map(([name, value]) => (
          <span className="resource-amount" key={name}>
            <ResourceName name={name} />
            <span>{Math.round(value! * 10) / 10}</span>
          </span>
        ))}
    </span>
  );
}
