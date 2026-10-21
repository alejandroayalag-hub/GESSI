import { input, label } from './ui';

export default function SelectorMes({ mes, onChange }) {
  return (
    <div>
      <label className={label}>Mes</label>
      <input type="month" className={input} value={mes} onChange={e => e.target.value && onChange(e.target.value)} />
    </div>
  );
}
