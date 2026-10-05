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
  it('preserves the step, gives gentle feedback and a quiet hint', () => {
    renderState('03');
    expect(screen.getByRole('math', { name: '3x + 2 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need a hint?' })).toBeInTheDocument();
    expect(screen.queryByText(/partial distribution|misconception|mastery/i)).not.toBeInTheDocument();
  });
});

describe('repeated misconception', () => {
  it('shows stronger feedback and an example action', () => {
    renderState('04');
    expect(screen.getByRole('math', { name: '3x + 2 = 18' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Remember: the number outside the brackets multiplies every term inside.',
    );
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Need a hint?' })).not.toBeInTheDocument();
  });
});

describe('learning state inspector', () => {
  it('shows the repeated-misconception learner UI beside the inspector', () => {
    renderState('06');
    expect(screen.getByRole('status')).toHaveTextContent('Remember: the number outside the brackets');
    const inspector = within(screen.getByRole('complementary', { name: 'Learning state inspector' }));
    expect(inspector.getByText('Partial distribution')).toBeInTheDocument();
    expect(inspector.getByText('0.61')).toBeInTheDocument();
    expect(inspector.getByText('2 / 3')).toBeInTheDocument();
    expect(exposureOf('Mastery').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Misconception label').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Next solution step').getByText('Hidden')).toBeInTheDocument();
    expect(exposureOf('Hint').getByText('Visible')).toBeInTheDocument();
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
    expect(screen.getByText(/complete/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Solved');
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
    for (const name of ['Check step', 'Need a hint?']) {
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
