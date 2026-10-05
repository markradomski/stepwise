import { render, screen, within } from '@testing-library/react';
import { DemoView } from './DemoView';
import { getDemoState } from './demoStates';

const renderState = (id: string) => render(<DemoView state={getDemoState(id)} />);

const exposureOf = (label: string) => within(screen.getByText(label, { selector: 'dt' }).closest('div')!);

describe('untouched question', () => {
  it('shows the question and a Check action', () => {
    renderState('01');
    expect(screen.getByRole('heading', { level: 1, name: 'Stepwise' })).toBeInTheDocument();
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

describe('valid step accepted', () => {
  it('keeps the accepted step and offers a new input', () => {
    renderState('02');
    expect(screen.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Step accepted')).toBeInTheDocument();
    expect(screen.getByLabelText('Write the equation after your next step')).toHaveValue('');
  });
});

describe('first incorrect attempt', () => {
  it('preserves the step, gives gentle feedback and a closed help launcher', () => {
    renderState('03');
    expect(screen.getByRole('math', { name: '3x + 2 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need help?' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Get a hint' })).not.toBeInTheDocument();
    expect(screen.queryByText(/partial distribution|misconception|mastery/i)).not.toBeInTheDocument();
  });
});

describe('repeated misconception', () => {
  it('shows stronger feedback with the help launcher closed', () => {
    renderState('04');
    expect(screen.getByRole('math', { name: '3x + 2 = 18' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Remember: the number outside the brackets multiplies every term inside.',
    );
    expect(screen.getByRole('button', { name: 'Help' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /example|hint/i })).not.toBeInTheDocument();
  });
});

describe('learning state inspector', () => {
  it('shows the repeated-misconception learner UI beside the inspector', () => {
    renderState('06');
    expect(screen.getByRole('status')).toHaveTextContent('Remember: the number outside the brackets');
    const inspector = within(screen.getByRole('complementary', { name: 'Learning state inspector' }));
    expect(inspector.getByText('Partial distribution')).toBeInTheDocument();
    expect(inspector.getByText('0.61')).toBeInTheDocument();
    expect(inspector.getByText('0 / 3')).toBeInTheDocument();
    expect(inspector.getByText('Show an example')).toBeInTheDocument();
    expect(exposureOf('Mastery').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Misconception label').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Next solution step').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Hint').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Worked example').getByText('Available')).toBeInTheDocument();
  });

  it('keeps diagnostic language out of the learner column', () => {
    renderState('06');
    const learner = within(screen.getByRole('main'));
    expect(learner.queryByText(/partial distribution|misconception|mastery|intervention/i)).not.toBeInTheDocument();
  });
});

describe('completed question', () => {
  it('shows completion without a mastery percentage', () => {
    renderState('05');
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText('Question complete')).toBeInTheDocument();
    expect(screen.getByText('You finished this question.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Question complete');
    expect(screen.getAllByText('Step accepted')).toHaveLength(3);
    expect(screen.queryByText(/mastery|%/i)).not.toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it('labels the maths input', () => {
    renderState('01');
    expect(screen.getByRole('textbox', { name: 'Write the equation after your next step' })).toBeInTheDocument();
  });

  it('disables the controls of a static fixture natively', () => {
    renderState('03');
    for (const name of ['Check step', 'Need help?']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByRole('textbox', { name: 'Write the equation after your next step' })).toBeDisabled();
  });

  it('keeps the entered value visible in the disabled input of a fixture', () => {
    renderState('03');
    expect(screen.getByRole('textbox')).toHaveValue('3x + 2 = 18');
  });

  it('states step status in text, not colour alone', () => {
    renderState('03');
    const step = screen.getByText('Needs attention').closest('li')!;
    expect(within(step).getByText('Needs attention')).toBeVisible();
    expect(step.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('help surface previews', () => {
  const surface = () => screen.getByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ });

  it('shows help closed on the untouched question', () => {
    renderState('01');
    expect(screen.getByRole('button', { name: 'Need help?' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ })).not.toBeInTheDocument();
  });

  it('shows an open prompt with no further action', () => {
    renderState('07');
    expect(within(surface()).getByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
    expect(within(surface()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Close help']);
    expect(screen.getByRole('button', { name: 'Help' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows an open hint with Show an example', () => {
    renderState('08');
    expect(within(surface()).getByRole('heading', { name: 'Hint' })).toBeInTheDocument();
    expect(within(surface()).getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('shows an open example with Show next step and one quiet View hint', () => {
    renderState('09');
    expect(within(surface()).getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    expect(within(surface()).getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
    expect(within(surface()).getByRole('button', { name: 'View hint' })).toBeInTheDocument();
  });

  it('shows a suggested next step in the sequence with fresh, closed help', () => {
    renderState('10');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need help?' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('explanation previews', () => {
  it('shows Explain this closed beside misconception feedback', () => {
    renderState('11');
    expect(screen.getByRole('button', { name: 'Explain this' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Explanation' })).not.toBeInTheDocument();
  });

  it('shows the misconception, accepted-step and suggested-step explanations open', () => {
    for (const [id, title] of [
      ['12', 'Why that step needs another look'],
      ['13', 'Why that step works'],
      ['14', 'Why this step works'],
    ]) {
      const { unmount } = renderState(id);
      expect(within(screen.getByRole('region', { name: 'Explanation' })).getByText(title)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close explanation' })).toBeDisabled();
      unmount();
    }
  });

  it('shows the safe fallback for an unavailable explanation', () => {
    renderState('15');
    expect(screen.getByRole('region', { name: 'Explanation' })).toHaveTextContent('I can’t add a useful explanation for this yet.');
  });
});


describe('review-path previews', () => {
  it('shows an unrecognised step honestly, without a diagnosis', () => {
    renderState('16');
    expect(screen.getByText('Not recognised yet')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('I can’t quite match that step yet.');
    expect(screen.queryByText(/wrong|incorrect|misconception/i)).not.toBeInTheDocument();
  });

  it('shows the provider fallback only in the inspector', () => {
    renderState('17');
    const inspector = within(screen.getByRole('complementary', { name: 'Learning state inspector' }));
    expect(inspector.getByText('Fallback · Timeout')).toBeInTheDocument();
    expect(inspector.getByText('Deterministic')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByText(/timeout|fallback|LLM/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('Why this step works')).toBeInTheDocument();
  });
});
