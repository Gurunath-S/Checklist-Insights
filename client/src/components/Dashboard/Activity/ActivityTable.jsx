import React from 'react';

const ActivityTable = ({ activities }) => {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 shadow-2xl shadow-black/10 mt-12">
      <h3 className="text-xl font-bold text-white mb-8">Recent Activity</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="text-left py-4 px-6 text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Checklist</th>
              <th className="text-left py-4 px-6 text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Date</th>
              <th className="text-left py-4 px-6 text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Response</th>
              <th className="text-left py-4 px-6 text-text-muted text-[0.7rem] uppercase tracking-widest font-bold text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activities.map((activity) => (
              <tr key={activity.id} className="group hover:bg-white/5 transition-colors">
                <td className="py-6 px-6 font-semibold text-white">{activity.checklist_name}</td>
                <td className="py-6 px-6 text-text-muted text-sm italic">
                  {new Date(activity.date).toLocaleDateString()}
                </td>
                <td className="py-6 px-6">
                  <span className="inline-flex px-4 py-1.5 rounded-full bg-white/5 border border-glass-border text-xs font-medium text-text-main shadow-inner">
                    {activity.input}
                  </span>
                </td>
                <td className="py-6 px-6 font-bold text-accent text-right text-lg">
                  +{activity.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityTable;
