// Sample interview notes, written for this app so a new user can see the analysis working.
// They are labelled as sample data in the UI and are not real customer research.
export const SAMPLE = {
  name: 'Sample: inspection reporting',
  audience: 'maintenance teams that write inspection reports',
  idea: 'turns photos and readings from a site visit into a finished, consistent report that can be searched later',
  interviews: [
    {
      label: 'Maintenance engineer',
      notes: `I do about 6 inspection reports a week. Each one takes me around 40 minutes because I copy the readings from my notebook into a spreadsheet and then paste the photos into Word. It is the most tedious part of my job.
Twice a month the report goes back to me because a reading was typed wrong, and I redo it. That costs me another hour each time.
Nobody can tell where a report is once I send it by email. The customer calls and asks for status and I have to search my inbox.`,
    },
    {
      label: 'Service supervisor',
      notes: `My team files reports late. The turnaround is usually 3 days after the visit. Customers complain about the delay.
We keep everything in different folders so it is hard to find an old report when an audit comes. Last quarter an audit took us two days to prepare because the history was scattered.
I spend 2 hours a week chasing technicians for missing photos.`,
    },
    {
      label: 'Field technician',
      notes: `I take photos on my phone and send them on WhatsApp. Then someone has to match them to the right machine.
I forgot to attach photos several times, which meant a repeat visit. Training new joiners on the report template takes weeks.
I hate retyping the same machine details every time. It is about 15 minutes per visit and I do 4 visits a day.`,
    },
    {
      label: 'Quality manager',
      notes: `The biggest problem is consistency. Every engineer writes the report differently, so I cannot compare machines over time.
Fixing inconsistent reports takes me 5 hours a week. There is a compliance risk because some reports miss safety checks.
We have no visibility on which machines have repeated defects.`,
    },
  ],
};
