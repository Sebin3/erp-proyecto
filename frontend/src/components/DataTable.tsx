import type { ReactNode } from 'react';
export function DataTable({ headers, numeric = [], children }: { headers: string[]; numeric?: number[]; children: ReactNode }) { return <div className="tw"><table><thead><tr>{headers.map((header,index) => <th key={header} className={numeric.includes(index) ? 'n' : ''}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
