export default function TestProjectPage() {
  return (
    <div>
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        background: 'green', 
        color: 'white', 
        padding: '10px', 
        zIndex: 9999,
        fontSize: '12px'
      }}>
        TEST PROJECT PAGE
      </div>
      <h1>Test Project Page</h1>
      <p>This is a static test route to verify routing works.</p>
    </div>
  );
}