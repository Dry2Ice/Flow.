// Test to verify all blocks are visible
const testBlocksVisibility = () => {
  console.log('Testing Flow blocks visibility...');

  // Check if main elements exist
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const promptInput = document.querySelector('[class*="PromptInput"]');

  console.log('Header found:', !!header);
  console.log('Main found:', !!main);
  console.log('Prompt input found:', !!promptInput);

  // Check Allotment panes
  const panes = document.querySelectorAll('[data-allotment-pane]');
  console.log('Allotment panes found:', panes.length);

  // Check specific components
  const codeEditor = document.querySelector('[class*="CodeEditor"]');
  const codePreview = document.querySelector('[class*="CodePreview"]');
  const aiChat = document.querySelector('[class*="AIChat"]');
  const developmentPlan = document.querySelector('[class*="DevelopmentPlan"]');

  console.log('Code Editor found:', !!codeEditor);
  console.log('Code Preview found:', !!codePreview);
  console.log('AI Chat found:', !!aiChat);
  console.log('Development Plan found:', !!developmentPlan);

  return {
    header: !!header,
    main: !!main,
    promptInput: !!promptInput,
    panes: panes.length,
    codeEditor: !!codeEditor,
    codePreview: !!codePreview,
    aiChat: !!aiChat,
    developmentPlan: !!developmentPlan
  };
};

// Run test after page loads
if (typeof window !== 'undefined') {
  setTimeout(testBlocksVisibility, 2000);
}