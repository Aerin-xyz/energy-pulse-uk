import { Link } from 'react-router-dom';
import generated from '@/data/energyMixGenerated.json';
// Historical evidence is deliberately separate from live readings: no build-time
// value is presented as current, and its actual reporting period never moves.
export function CitableEvidence() {
 const report=generated.reports[0];
 return <details className="grid-evidence-brief citable-evidence"><summary>Sources, definitions and a validated reporting example</summary>
 <h2>What does this electricity data cover?</h2>
 <p>Energy Mix covers Great Britain: England, Scotland and Wales. Northern Ireland operates in a separate electricity market. Elexon national generation readings, NESO embedded-generation estimates and carbon-intensity forecasts have different coverage and observation times.</p>
 <p>Power in MW describes a rate; energy in MWh describes an amount over time. A half-hour average of 1 MW corresponds to 0.5 MWh. Imports are transfers, not domestic generation. Pumped storage shifts electricity through time and is excluded from primary generation totals.</p>
 <h2>Can a power station’s notified output be treated as actual generation?</h2>
 <p>No. Elexon Physical Notifications describe intended operation. Accepted balancing instructions are instructions, not metered delivery. Asset maps distinguish these from delayed measured history and sites with capacity/location information only.</p>
 <h2>A reproducible historical example—not a live reading</h2>
 <p>Published {report.date}; reporting window {report.period}. Figures remain provisional and source-revisable. This dated example does not answer what the grid is generating now.</p>
 <dl>{report.metrics.slice(0,3).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <p>{report.methodologyNote}</p>
 <p><Link to={report.slug+'/'}>Read the dated report and retained source evidence</Link> · <Link to="/methodology/">Definitions and calculation methods</Link> · <Link to="/citation/">How to cite</Link> · <Link to="/contact/">Report a correction</Link></p>
 <p>Editorial responsibility: Energy Mix. We interpret public records; we are not Elexon or the system operator. Corrections should identify the page, period and conflicting source record. Successful validation means the retained records reproduce the calculation, not that provisional source observations cannot be revised.</p>
 </details>;
}
