import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeView } from './PracticeView';

const setup = (showInspector = false) => {
  const user = userEvent.setup();
  render(<PracticeView showInspector={showInspector} />);
  const input = () => screen.getByRole('textbox', { name: 'Write the equation after your next step' });
  const submit = async (value: string) => {
    await user.clear(input());
    await user.type(input(), value);
    await user.click(screen.getByRole('button', { name: 'Check step' }));
  };
  const press = (name: string) => user.click(screen.getByRole('button', { name }));
  return { user, input, submit, press };
};

const status = () => screen.getByRole('status');
const check = () => screen.getByRole('button', { name: 'Check step' });
const actions = () => within(check().parentElement as HTMLElement);
const helpButtons = () => actions().getAllByRole('button').filter((button) => button !== check());
const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;

describe('help surface', () => {
  it('offers Check step and a low-key Need help? before anything has gone wrong', () => {
    setup();
    expect(check()).toBeInTheDocument();
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Need help?']);
  });

  it('keeps Check step primary: first in the action area, with help alongside it as a lighter control', () => {
    setup();
    const [help] = helpButtons();
    expect(check().compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(check().parentElement).toBe(help.parentElement);
    expect(check().className).not.toBe(help.className);
    expect(help.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives only a generic prompt from Need help?, and no further help to ask for', async () => {
    const { input, press } = setup(true);
    await press('Need help?');
    expect(status()).toHaveTextContent('Think about how you could make the equation simpler.');
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(screen.queryByRole('math', { name: '3x + 6 = 18' })).not.toBeInTheDocument();
    expect(helpButtons()).toHaveLength(0);
    expect(input()).toHaveFocus();
    expect(value('Source')).toHaveTextContent('Generic');
    expect(value('Forward action')).toHaveTextContent('None');
    expect(value('Prompt seen')).toHaveTextContent('Yes');
    expect(value('Detected misconception')).toHaveTextContent('None');
    expect(value('Repeated misconception count')).toHaveTextContent('0');
    expect(value('Worked example')).toHaveTextContent('Hidden');
    expect(value('Next solution step')).toHaveTextContent('Hidden');
  });

  it('lets a recognised misconception take over from generic help', async () => {
    const { submit, press } = setup(true);
    await press('Need help?');
    await submit('3x + 2 = 18');
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(status()).not.toHaveTextContent('Think about how you could make the equation simpler.');
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Get a hint', 'View prompt']);
    expect(value('Source')).toHaveTextContent('Misconception');
  });

  it('climbs one help action at a time: Get a hint, Show an example, Show next step', async () => {
    const { submit, press } = setup();
    await submit('3x + 2 = 18');
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Get a hint']);

    await press('Get a hint');
    expect(status()).toHaveTextContent('The 3 applies to everything inside the brackets.');
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Show an example']);

    await press('Show an example');
    expect(screen.getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Show next step', 'View hint']);

    await press('Show next step');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Need help?']);
  });

  it('shows revealed help between the working and the input, close to the equation it refers to', async () => {
    const { input, press } = setup();
    await press('Need help?');
    const working = screen.getByRole('region', { name: 'Your working' });
    expect(within(working).getByText('Think about how you could make the equation simpler.')).toBeInTheDocument();
    const list = within(working).getByRole('list', { name: 'Working so far' });
    const hint = within(working).getByText('Think about how you could make the equation simpler.');
    expect(list.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps generic help available after an unrecognised step, without a diagnosis', async () => {
    const { submit, press } = setup();
    await submit('6 + 3x = 18');
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Need help?']);
    await press('Need help?');
    expect(status()).toHaveTextContent('Think about how you could make the equation simpler.');
    expect(screen.queryByText(/Have another look/)).not.toBeInTheDocument();
  });

  it('asks for new help on each step, with that step’s own prompt', async () => {
    const { submit, press } = setup();
    await press('Need help?');
    await submit('3x + 6 = 18');
    expect(status()).toBeEmptyDOMElement();
    await press('Need help?');
    expect(status()).toHaveTextContent('What operation would undo the +6?');
    await submit('3x = 12');
    await press('Need help?');
    expect(status()).toHaveTextContent('What operation would leave x on its own?');
  });

  it('resets help for each new question and gives that question its own prompt', async () => {
    const { submit, press } = setup(true);
    await press('Need help?');
    await submit('x + 2 = 6');
    await submit('x = 4');
    await press('Next question');

    expect(screen.queryByText(/Think about how you could make the equation simpler/)).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
    expect(helpButtons().map((button) => button.textContent)).toEqual(['Need help?']);
    expect(value('Prompt seen')).toHaveTextContent('No');
    await press('Need help?');
    expect(status()).toHaveTextContent('What operation would undo the +5?');
    expect(value('Generic help requests')).toHaveTextContent('2');
  });

  it('offers no help once a question is complete', async () => {
    const { submit } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(screen.queryByRole('button', { name: /help|hint|example|next step/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Next question' })).toBeInTheDocument();
  });

  it('never presents the help as AI, chat, a tutor or a level', async () => {
    const { submit, press } = setup();
    await press('Need help?');
    await submit('3x + 2 = 18');
    await press('Get a hint');
    await press('Show an example');
    await press('Show next step');
    expect(within(screen.getByRole('main')).queryByText(/\b(ai|chat|tutor|assistant)\b|help level|hint level/i)).toBeNull();
  });
});
