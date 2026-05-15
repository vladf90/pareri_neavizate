/**
 * Shared FontStyles component for all overlay widgets.
 * Injects Google Fonts (Bebas Neue, Montserrat) into the document.
 * Also includes utility classes for scrollbar hiding.
 * 
 * Usage: Include <FontStyles /> once at the top of your overlay page.
 */

export function FontStyles() {
  return (
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-bebas {
          font-family: 'Bebas Neue', sans-serif;
        }
        .font-montserrat {
          font-family: 'Montserrat', sans-serif;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}
    </style>
  );
}
