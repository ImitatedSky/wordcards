import "./styles.css";
import Card from "./components/Card";
export default function App() {
  const wordList = [
    {
      word: "React",
      definition: "A JavaScript library for building user interfaces.",
    },
    {
      word: "Component",
      definition: "A reusable and self-contained piece of UI.",
    },
    {
      word: "Props",
      definition:
        'Short for "properties," they are used to pass data from one component to another.',
    },
  ];
  return (
    <div className="App">
      {wordList.map((item, index) => (
        <Card word={item.word} definition={item.definition} />
      ))}
    </div>
  );
}
