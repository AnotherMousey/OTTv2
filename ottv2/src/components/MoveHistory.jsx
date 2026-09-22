export default function MoveHistory({ history }) {
  return (
    <section className="sidebar-card history-card">
      <div className="sidebar-card__heading">
        <h3>Move history</h3>
        <span>{history.length}</span>
      </div>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="muted">No moves yet.</p>
        ) : (
          [...history].reverse().map((entry, index) => (
            <div className="history-entry" key={`${entry}-${index}`}>{entry}</div>
          ))
        )}
      </div>
    </section>
  );
}
