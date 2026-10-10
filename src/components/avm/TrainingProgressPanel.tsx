/** No-run state: live training telemetry is not provided by the run-list read model. */
export function TrainingProgressPanel() {
  return (
    <section className="module-section" aria-labelledby="training-state">
      <h3 id="training-state" className="text-base font-semibold">Training runs</h3>
      <p className="mt-3 text-sm text-muted-foreground">No training runs are available.</p>
    </section>
  );
}
