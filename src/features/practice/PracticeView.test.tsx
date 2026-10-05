import { render, screen, within } from '@testing-library/react';
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
  return { user, input, submit };
};

const learnerColumn = () => within(screen.getByRole('main'));

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
    await submit('3x + 2 = 18');
    expect(screen.getByRole('math', { name: '3x + 2 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByRole('button', { name: 'Need a hint?' })).toBeInTheDocument();
    expect(input()).toHaveValue('3x + 2 = 18');
    expect(input()).toHaveFocus();
  });

  it('shows stronger feedback when the same mistake is repeated', async () => {
    const { submit } = setup();
    await submit('3x + 2 = 18');
    await submit('3x + 2 = 18');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Remember: the number outside the brackets multiplies every term inside.',
    );
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('gives generic feedback for an unrecognised step', async () => {
    const { submit } = setup();
    await submit('x = 100');
    expect(screen.getByRole('status')).toHaveTextContent('Have another look at that step.');
    expect(screen.queryByRole('button', { name: /hint|example/i })).not.toBeInTheDocument();
  });

  it.each([
    ['distribute first', ['3x + 6 = 18', '3x = 12', 'x = 4'], 3],
    ['divide first', ['x + 2 = 6', 'x = 4'], 2],
  ])('completes by the %s path and keeps the working history', async (_name, steps, count) => {
    const { submit } = setup();
    for (const step of steps) await submit(step);
    expect(screen.getByText('Round 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Solved');
    expect(screen.getAllByText('Step accepted')).toHaveLength(count);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/mastery|%/i)).not.toBeInTheDocument();
  });

  it('keeps diagnostic wording out of the learner UI', async () => {
    const { submit } = setup(true);
    await submit('3x + 2 = 18');
    await submit('3x + 2 = 18');
    expect(learnerColumn().queryByText(/partial distribution|misconception|mastery|intervention|hint level/i)).toBeNull();
  });

  it('reflects real diagnostic state in the inspector', async () => {
    const { submit } = setup(true);
    const inspector = () => within(screen.getByRole('complementary', { name: 'Learning state inspector' }));
    const rowValue = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;

    expect(rowValue('Detected misconception')).toHaveTextContent('None');

    await submit('3x + 2 = 18');
    expect(rowValue('Detected misconception')).toHaveTextContent('Partial distribution');
    expect(rowValue('Hint level')).toHaveTextContent('1 / 3');
    expect(rowValue('Hint')).toHaveTextContent('Visible');
    expect(rowValue('Worked example')).toHaveTextContent('Hidden');

    await submit('3x + 2 = 18');
    expect(rowValue('Attempt')).toHaveTextContent('2');
    expect(rowValue('Repeated misconception count')).toHaveTextContent('2');
    expect(rowValue('Hint level')).toHaveTextContent('2 / 3');
    expect(rowValue('Worked example')).toHaveTextContent('Available');
    expect(rowValue('Mastery')).toHaveTextContent('Hidden');
    expect(inspector().getByText('0.61')).toBeInTheDocument();
  });
});
