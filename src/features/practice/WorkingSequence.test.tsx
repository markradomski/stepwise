import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
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
  const press = async (name: string) => {
    if (/^(Get a hint|Show an example|Show next step)$/.test(name) && !screen.queryByRole('button', { name })) {
      const launcher = screen.getByRole('button', { name: /^(Need help\?|Help)$/ });
      if (launcher.getAttribute('aria-expanded') === 'false') await user.click(launcher);
    }
    await user.click(screen.getByRole('button', { name }));
  };
  return { user, input, submit, press };
};

const sequence = () => screen.getByRole('list', { name: 'Working so far' });
const lines = () => within(sequence()).getAllByRole('listitem');
const equations = () => lines().map((line) => within(line).getByRole('math').getAttribute('aria-label'));
const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const helpSurface = () => screen.getByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ });
const status = () => screen.getByRole('status');

describe('working sequence', () => {
  it('starts with the given equation, labelled as given', () => {
    setup();
    expect(equations()).toEqual(['3(x + 2) = 18']);
    expect(within(lines()[0]).getByText('Given')).toBeInTheDocument();
  });

  it('keeps accepted learner steps in the order they were entered, after the given line', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    await submit('3x = 12');
    await submit('x = 4');
    expect(equations()).toEqual(['3(x + 2) = 18', '3x + 6 = 18', '3x = 12', 'x = 4']);
    expect(within(lines()[0]).getByText('Given')).toBeInTheDocument();
  });

  it('leaves learner-authored lines unlabelled as authorship, saying only that they were accepted', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    const line = lines()[1];
    expect(within(line).getByText('Step accepted')).toBeInTheDocument();
    expect(within(line).queryByText(/learner|you wrote|suggested/i)).toBeNull();
  });

  it('does not let a rejected attempt into the accepted history', async () => {
    const { submit } = setup();
    await submit('3x + 2 = 18');
    expect(equations()).toEqual(['3(x + 2) = 18', '3x + 2 = 18']);
    expect(screen.queryByText('Step accepted')).not.toBeInTheDocument();
    expect(within(lines()[1]).getByText('Attempt')).toBeInTheDocument();

    await submit('3x + 6 = 18');
    expect(equations()).toEqual(['3(x + 2) = 18', '3x + 6 = 18']);
    expect(screen.queryByText('Attempt')).not.toBeInTheDocument();
  });

  it('tells a recognised misconception apart from an unrecognised step, in words', async () => {
    const { submit } = setup();
    await submit('3x + 2 = 18');
    expect(within(lines()[1]).getByText('Needs attention')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Have another look');

    await submit('6 + 3x = 18');
    expect(within(lines()[1]).getByText('Not recognised yet')).toBeInTheDocument();
    expect(within(lines()[1]).queryByText('Needs attention')).toBeNull();
    expect(status()).toHaveTextContent('I can’t quite match that step yet.');
    expect(status()).not.toHaveTextContent('Have another look');
  });

  it('labels a suggested next step and keeps it inside the sequence, apart from learner work', async () => {
    const { submit, press } = setup();
    await submit('3x + 2 = 18');
    await press('Get a hint');
    await press('Show an example');
    await press('Show next step');

    expect(equations()).toEqual(['3(x + 2) = 18', '3x + 6 = 18']);
    const suggested = lines()[1];
    expect(within(suggested).getByText('Suggested next step')).toBeInTheDocument();
    expect(within(suggested).queryByText('Step accepted')).toBeNull();
    expect(screen.getAllByText('Suggested next step')).toHaveLength(1);

    await submit('3x = 12');
    expect(equations()).toEqual(['3(x + 2) = 18', '3x + 6 = 18', '3x = 12']);
    expect(within(lines()[2]).queryByText('Suggested next step')).toBeNull();
  });

  it('puts the active input after the working, and feedback between the two', async () => {
    const { submit, input } = setup();
    await submit('3x + 2 = 18');
    const attempt = lines().at(-1)!;
    expect(before(attempt, status())).toBe(true);
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(before(status(), input())).toBe(true);
    expect(before(input(), screen.getByRole('button', { name: 'Check step' }))).toBe(true);
  });

  it('keeps help below the input, after the working it concerns', async () => {
    const { submit, press, input } = setup();
    await submit('3x + 2 = 18');
    await press('Get a hint');
    expect(helpSurface()).toHaveTextContent('The 3 applies to everything inside the brackets.');
    expect(before(lines().at(-1)!, status())).toBe(true);
    expect(before(status(), input())).toBe(true);
    expect(before(input(), helpSurface())).toBe(true);
  });

  it('names generic help a Prompt and misconception help a Hint', async () => {
    const { submit, press } = setup();
    await press('Need help?');
    expect(screen.getByRole('region', { name: 'Prompt' })).toBeInTheDocument();
    await submit('3x + 2 = 18');
    await press('Get a hint');
    expect(screen.getByRole('region', { name: 'Hint' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Prompt' })).not.toBeInTheDocument();
  });

  it('keeps the whole working, in order, ahead of the completion panel', async () => {
    const { submit } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(equations()).toEqual(['3(x + 2) = 18', 'x + 2 = 6', 'x = 4']);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(before(sequence(), status())).toBe(true);
    expect(status()).toHaveTextContent('Question complete');
  });

  it('starts the next question with none of the previous working', async () => {
    const { submit, press } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    await press('Next question');
    expect(equations()).toEqual(['2x + 5 = 17']);
    expect(screen.queryByText('Step accepted')).not.toBeInTheDocument();
  });
});

describe('working sequence accessibility', () => {
  it('keeps the input label and the buttons’ accessible names', async () => {
    const { submit, press } = setup();
    expect(screen.getByLabelText('Write the equation after your next step')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need help?' })).toBeInTheDocument();
    await submit('3x + 2 = 18');
    await press('Get a hint');
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('keeps every state discoverable as text, not only as an icon or colour', async () => {
    const { submit, press } = setup();
    expect(screen.getByText('Given')).toBeInTheDocument();
    await press('Need help?');
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    await submit('3x + 2 = 18');
    expect(screen.getByText('Attempt')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    await press('Get a hint');
    expect(screen.getByText('Hint')).toBeInTheDocument();
    await press('Show an example');
    expect(screen.getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    await press('Show next step');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    for (const icon of document.querySelectorAll('main svg')) expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the DOM in reading order: given, working, feedback, input, actions', async () => {
    const { submit, input } = setup();
    await submit('3x + 6 = 18');
    await submit('3x + 2 = 18');
    const order = [
      within(lines()[0]).getByText('Given'),
      lines()[1],
      lines()[2],
      status(),
      input(),
      screen.getByRole('button', { name: 'Check step' }),
    ];
    for (let index = 1; index < order.length; index += 1) expect(before(order[index - 1], order[index])).toBe(true);
  });

  it('shows the completion title where it can be found', async () => {
    const { submit } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(screen.getByText('Question complete')).toBeInTheDocument();
  });
});

describe('static previews use the same working sequence', () => {
  afterEach(() => window.history.pushState(null, '', '/'));

  it.each([
    ['02', ['3(x + 2) = 18', '3x + 6 = 18'], 'Step accepted'],
    ['03', ['3(x + 2) = 18', '3x + 2 = 18'], 'Needs attention'],
    ['05', ['3(x + 2) = 18', '3x + 6 = 18', '3x = 12', 'x = 4'], 'Step accepted'],
  ])('renders state %s', (id, expected, label) => {
    window.history.pushState(null, '', `/?state=${id}`);
    render(<App />);
    expect(equations()).toEqual(expected);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(within(lines()[0]).getByText('Given')).toBeInTheDocument();
  });
});
