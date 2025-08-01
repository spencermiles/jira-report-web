import Projects from '@/components/projects/Projects';

export default function Home() {
  console.log('Home page rendered');
  return (
    <div>
      {/* Debug info - remove after fixing */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        background: 'blue', 
        color: 'white', 
        padding: '10px', 
        zIndex: 9999,
        fontSize: '12px'
      }}>
        HOME PAGE
      </div>
      <Projects />
    </div>
  );
}
