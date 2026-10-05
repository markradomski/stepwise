import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeView } from './PracticeView';

const setup = (showInspector = false) => {
  const user = userEvent.setup();
  render(<PracticeView showInspector={showInspector} />);
  const input = () => screen.getByRole('textbox', { name: 'Your next step' });
  const submit = async (value: string) => {
    await user.clear(input());
    await user.type(input(), value);
    await user.click(screen.getByRole('button', { name: /^(Check|Try again)$/ }));
  };
  const press = (name: string) => user.click(screen.getByRole('button', { name }));
  return { user, input, submit, press };
};

const mistake = '3x + 2 = 18';
const learnerColumn = () => within(screen.getByRole('main'));
const status = () => screen.getByRole('status');

describe('practice interaction', () => {
  it('disables Check while the input is empty', async () => {
    const { user, input } = setup();
    const check = screen.getByRole('button', { name: 'Check' });
    expect(check).toBeDisabled();
    await user.type(input(), '   ');
    expect(check).toBeDisabled();
    await user.type(input(), '3x + 6 = 18');
    expect(check).toBeEnabled();
  });

  it('adds a valid step to the working history, clears the input and refocuses it', async () => {
    const { input, submit } = setup();
    await submit('3x+6=18');
    expect(screen.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Step accepted')).toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('submits with Enter', async () => {
    const { user, input } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();
  });

  it('keeps rejected work visible with gentle feedback and keeps focus in the input', async () => {
    const { input, submit } = setup();
    await submit(mistake);
    expect(screen.getByRole('math', { name: mistake })).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByRole('button', { name: 'Need a hint?' })).toBeInTheDocument();
    expect(input()).toHaveValue(mistake);
    expect(input()).toHaveFocus();
  });

  it('shows stronger feedback and the example action when the same mistake is repeated', async () => {
    const { submit } = setup();
    await submit(mistake);
    await submit(mistake);
    expect(status()).toHaveTextContent('Remember: the number outside the brackets multiplies every term inside.');
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('gives generic feedback for an unrecognised step and offers no help', async () => {
    const { submit } = setup();
    await submit('x = 100');
    expect(status()).toHaveTextContent('Have another look at that step.');
    expect(screen.queryByRole('button', { name: /hint|example|next step/i })).not.toBeInTheDocument();
  });

  it.each([
    ['distribute first', ['3x + 6 = 18', '3x = 12', 'x = 4'], 3],
    ['divide first', ['x + 2 = 6', 'x = 4'], 2],
  ])('completes by the %s path and keeps the working history', async (_name, steps, count) => {
    const { submit } = setup();
    for (const step of steps) await submit(step);
    expect(screen.getByText('Round 2 of 3')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Solved');
    expect(screen.getAllByText('Step accepted')).toHaveLength(count);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/mastery|%/i)).not.toBeInTheDocument();
  });
});

describe('progressive help', () => {
  it('reveals a conceptual hint without giving the answer, and keeps the attempt and focus', async () => {
    const { input, submit, press } = setup();
    await submit(mistake);
    await press('Need a hint?');
    expect(status()).toHaveTextContent('The 3 applies to everything inside the brackets.');
    expect(learnerColumn().queryByRole('math', { name: '3x + 6 = 18' })).not.toBeInTheDocument();
    expect(input()).toHaveValue(mistake);
    expect(input()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Need a hint?' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('shows a worked example on a different expression that does not solve the question', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    await submit(mistake);
    await press('Show an example');

    const example = within(screen.getByRole('group', { name: 'Worked example' }));
    expect(example.getByRole('math', { name: '2(y + 4)' })).toBeInTheDocument();
    expect(example.getByRole('math', { name: '2y + 8' })).toBeInTheDocument();
    expect(example.getByText('The number outside the brackets multiplies each term inside.')).toBeInTheDocument();
    expect(screen.queryByRole('math', { name: '3x + 6 = 18' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
  });

  it('only offers the next step after the example has been seen', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    expect(screen.queryByRole('button', { name: 'Show next step' })).not.toBeInTheDocument();
    await press('Need a hint?');
    expect(screen.queryByRole('button', { name: 'Show next step' })).not.toBeInTheDocument();
    await press('Show an example');
    expect(screen.getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
  });

  it('inserts the next step as a labelled system-provided step and lets the learner carry on', async () => {
    const { input, submit, press } = setup();
    await submit(mistake);
    await press('Need a hint?');
    await press('Show an example');
    await press('Show next step');

    const steps = within(screen.getByRole('list', { name: 'Working so far' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(1);
    expect(steps.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(steps.getByText('Suggested next step')).toBeInTheDocument();
    expect(steps.queryByText('Step accepted')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();

    await submit('3x = 12');
    await submit('x = 4');
    expect(status()).toHaveTextContent('Solved');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
  });

  it('acknowledges a correct final answer from the start without completing', async () => {
    const { input, submit } = setup();
    await submit('x = 4');
    expect(status()).toHaveTextContent('That answer is correct. Can you show one step that gets you there?');
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Working so far' })).not.toBeInTheDocument();
    expect(input()).toBeInTheDocument();
    expect(input()).toHaveFocus();

    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(status()).toHaveTextContent('Solved');
  });

  it('keeps diagnostic and system language out of the learner UI', async () => {
    const { submit, press } = setup(true);
    await submit(mistake);
    await press('Need a hint?');
    await submit(mistake);
    await press('Show an example');
    await press('Show next step');
    await submit('x = 4');
    expect(
      learnerColumn().queryByText(/partial distribution|misconception|mastery|intervention|hint level|wrong|incorrect|failed/i),
    ).toBeNull();
  });
});

describe('completion and restart', () => {
  it('moves focus to Restart question when the question completes', async () => {
    const { submit } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart question' })).toHaveFocus());
  });

  it('does not restart when the final step is submitted with Enter', async () => {
    const { user, input } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    await user.type(input(), 'x = 4{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart question' })).toHaveFocus());
    expect(status()).toHaveTextContent('Solved');
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
  });

  it('restores the initial question and returns focus to the input', async () => {
    const { input, submit, press } = setup(true);
    await submit(mistake);
    await submit(mistake);
    await press('Show an example');
    await press('Show next step');
    await submit('3x = 12');
    await submit('x = 4');
    await press('Restart question');

    expect(screen.queryByRole('list', { name: 'Working so far' })).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();

    const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
    expect(value('Attempt')).toHaveTextContent('0');
    expect(value('Detected misconception')).toHaveTextContent('None');
    expect(value('Hint')).toHaveTextContent('Hidden');
    expect(value('Next solution step')).toHaveTextContent('Hidden');
  });
});

describe('inspector', () => {
  const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;

  it('reflects the real help and exposure state through the escalation', async () => {
    const { submit, press } = setup(true);
    expect(value('Hint')).toHaveTextContent('Hidden');
    expect(value('Last validation')).toHaveTextContent('None');

    await submit(mistake);
    expect(value('Detected misconception')).toHaveTextContent('Partial distribution');
    expect(value('Last validation')).toHaveTextContent('Misconception');
    expect(value('Hint level')).toHaveTextContent('1 / 3');
    expect(value('Hint')).toHaveTextContent('Available');
    expect(value('Worked example')).toHaveTextContent('Hidden');

    await press('Need a hint?');
    expect(value('Hint')).toHaveTextContent('Visible');
    expect(value('Worked example')).toHaveTextContent('Available');

    await submit(mistake);
    expect(value('Attempt')).toHaveTextContent('2');
    expect(value('Repeated misconception count')).toHaveTextContent('2');
    expect(value('Hint level')).toHaveTextContent('2 / 3');
    expect(value('Next solution step')).toHaveTextContent('Hidden');

    await press('Show an example');
    expect(value('Worked example')).toHaveTextContent('Visible');
    expect(value('Next solution step')).toHaveTextContent('Available');
    expect(value('Hint level')).toHaveTextContent('3 / 3');

    await press('Show next step');
    expect(value('Next solution step')).toHaveTextContent('Visible');
    expect(value('Mastery')).toHaveTextContent('Hidden');
    expect(value('Misconception label')).toHaveTextContent('Hidden');
    expect(screen.getByText('0.61')).toBeInTheDocument();
  });

  it('shows that a skipped answer is valid but not complete', async () => {
    const { submit } = setup(true);
    await submit('x = 4');
    expect(value('Last validation')).toHaveTextContent('Valid, skipped steps');
    expect(value('Detected misconception')).toHaveTextContent('None');
    expect(value('Attempt')).toHaveTextContent('0');
  });
});
