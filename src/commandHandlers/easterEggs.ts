const COWSAY_WIDTH = 40;
const COW = String.raw`        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||`;

// words wrapped to lines of at most `width` characters; a longer word is cut
const wrapText = (text: string, width: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    for (let start = 0; start < word.length; start += width) {
      const chunk = word.slice(start, start + width);
      if (line && line.length + 1 + chunk.length <= width) line += ` ${chunk}`;
      else {
        if (line) lines.push(line);
        line = chunk;
      }
    }
  }
  return [...lines, line];
};

// the cow of `cowsay` with the text in a speech bubble
export const getCowsay = (text: string) => {
  const lines = wrapText(text, COWSAY_WIDTH);
  const width = Math.max(...lines.map((line) => line.length));
  const bubble = lines.map((line, index) => {
    const [left, right] =
      lines.length === 1
        ? ["<", ">"]
        : index === 0
          ? ["/", "\\"]
          : index === lines.length - 1
            ? ["\\", "/"]
            : ["|", "|"];
    return `${left} ${line.padEnd(width)} ${right}`;
  });
  return [` ${"_".repeat(width + 2)}`, ...bubble, ` ${"-".repeat(width + 2)}`, COW].join("\n");
};

// a random entry of a "\n%\n"-separated list, like the files of `fortune`
export const getFortune = (fortunes: string, random = Math.random()) => {
  const entries = fortunes.split("\n%\n");
  return entries[Math.floor(random * entries.length)];
};

// the steam locomotive of `sl`, the punishment for a mistyped `ls`
export const LOCOMOTIVE = String.raw`      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|_
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/`;

export const COFFEE_CUP = String.raw`    ( (
     ) )
  ........
  |      |]
  \      /
   '----'`;

// the empty buffer of `vim`
export const VIM_SCREEN = ["~", "~", "~", "~"].join("\n");
