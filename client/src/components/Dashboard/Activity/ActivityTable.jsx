import React from 'react';

const ActivityTable = ({ activities }) => {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Checklist</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Response</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{activity.checklist_name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {new Date(activity.date).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '2rem', 
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: '0.85rem'
                  }}>
                    {activity.input}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
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
