import React, { useState } from "react";
import shuffle from "../shuffle";
import "./Quiz.css";

export default function Quiz({
  options,
  question,
  correctOption,
  testState,
  disabled,
  showAnswerKey,
  ...props
}) {
  const [chosenOne, setChosenOne] = React.useState();
  const [selectedOption, setSelectedOption] = useState("");
  const [isCorrect, setisCorrect] = useState(false);
  const [isActive, setIsActive] = useState([false, false, false, false]);

  const list = React.useMemo(() => {
    const protolist = [];
    protolist.push(correctOption);
    options.map((elem) => protolist.push(decodeURIComponent(elem)));
    const list = shuffle([...protolist]);
    return list;
  }, [question]);

  function simplyPrintThis(x) {
    let val = x.value;
    setSelectedOption(val);
    setisCorrect(val === correctOption);
  }

  function setOneDumbList(index) {
    let activeList = [...isActive];
    for (let i = 0; i < activeList.length; i++) {
      if (i == index) {
        activeList[index] = true;
      } else {
        activeList[i] = false;
      }
    }
    return activeList;
  }

  function newActive(i) {
    let stupid = setOneDumbList(i);
    setIsActive(stupid);
  }

  return (
    <div className="quiz">
      <div className="container">
        <div className="question">{question}</div>
        <div className="options">
          <div>
            {list.map((person, i) => (
              <label
                key={i}
                htmlFor={person}
                data-chosen={chosenOne === person && !showAnswerKey}
                className={`${
                  showAnswerKey && person == correctOption
                    ? "correct-option"
                    : showAnswerKey && isActive[i] === true
                    ? "wrong-option"
                    : showAnswerKey &&
                      person !== correctOption &&
                      isActive[i] == false
                    ? "disabled-options"
                    : "default"
                }`}
              >
                <input
                  type="radio"
                  name="options"
                  id={person}
                  key={i}
                  value={person}
                  className={`check-btn`}
                  onChange={(e) => {
                    setChosenOne(e.target.value);
                    setSelectedOption(e.target.value);
                    simplyPrintThis(e.target);
                    testState(e, props.quizIndex, correctOption);
                    newActive(i);
                  }}
                  disabled={disabled}
                />
                <span className="text-inner">{person}</span>
              </label>
            ))}
          </div>
        </div>
        <hr className="dash" />
      </div>
    </div>
  );
}

export { Quiz };
