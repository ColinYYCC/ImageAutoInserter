import styled from 'styled-components';

const TestPage = () => {
  return (
    <StyledTestPage>
      <h1>RobotLoader 测试</h1>
      <div className="testContainer">
        <h2>原始尺寸</h2>
        <LoaderOriginal />
      </div>
      <div className="testContainer">
        <h2>缩小尺寸</h2>
        <LoaderScaled />
      </div>
    </StyledTestPage>
  );
};

const LoaderOriginal = () => {
  return (
    <StyledWrapper>
      <div className="circ">
        <div className="load">Loading . . . </div>
        <div className="hands" />
        <div className="body" />
        <div className="head">
          <div className="eye" />
        </div>
      </div>
    </StyledWrapper>
  );
};

const LoaderScaled = () => {
  return (
    <StyledWrapperScaled>
      <div className="circ">
        <div className="load">Loading . . . </div>
        <div className="hands" />
        <div className="body" />
        <div className="head">
          <div className="eye" />
        </div>
      </div>
    </StyledWrapperScaled>
  );
};

const StyledWrapper = styled.div`
  .load {
    display: none;
  }

  .eye {
    width: 20px;
    height: 8px;
    background-color: rgba(240,220,220,1);
    border-radius: 0px 0px 20px 20px;
    position: relative;
    left: 10px;
    top: 40px;
    box-shadow: 40px 0px 0px 0px rgba(240,220,220,1);
  }

  .head {
    backface-visibility: hidden;
    position: relative;
    margin: -10px auto;
    width: 80px;
    height: 80px;
    background-color: #111;
    border-radius: 50px;
    box-shadow: inset -4px 2px 0px 0px rgba(240,220,220,1);
    animation: headAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
  }

  .body {
    position: relative;
    margin: 90px auto;
    width: 140px;
    height: 120px;
    background-color: #111;
    border-radius: 50px/25px;
    box-shadow: inset -5px 2px 0px 0px rgba(240,220,220,1);
    animation: bodyAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
  }

  @keyframes headAnim {
    0% {
      top: 0px;
    }

    50% {
      top: 10px;
    }

    100% {
      top: 0px;
    }
  }

  @keyframes bodyAnim {
    0% {
      top: -5px;
    }

    50% {
      top: 10px;
    }

    100% {
      top: -5px;
    }
  }

  .circ {
    backface-visibility: hidden;
    margin: 60px auto;
    width: 180px;
    height: 180px;
    border-radius: 0px 0px 50px 50px;
    position: relative;
    z-index: 1;
    left: 0%;
    top: 20%;
    overflow: hidden;
  }

  .hands {
    margin-top: 140px;
    width: 120px;
    height: 120px;
    position: absolute;
    background-color: #111;
    border-radius: 20px;
    box-shadow: -1px -4px 0px 0px rgba(240,220,220,1);
    transform: rotate(45deg);
    top: 75%;
    left: 16%;
    z-index: 2;
    animation: bodyAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
  }
`;

const StyledWrapperScaled = styled.div`
  transform: scale(0.5);
  transform-origin: center center;

  .load {
    display: none;
  }

  .eye {
    width: 20px;
    height: 8px;
    background-color: rgba(240,220,220,1);
    border-radius: 0px 0px 20px 20px;
    position: relative;
    left: 10px;
    top: 40px;
    box-shadow: 40px 0px 0px 0px rgba(240,220,220,1);
  }

  .head {
    backface-visibility: hidden;
    position: relative;
    margin: -10px auto;
    width: 80px;
    height: 80px;
    background-color: #111;
    border-radius: 50px;
    box-shadow: inset -4px 2px 0px 0px rgba(240,220,220,1);
    animation: headAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
    z-index: 3;
  }

  .body {
    position: relative;
    margin: 90px auto;
    width: 140px;
    height: 120px;
    background-color: #111;
    border-radius: 50px/25px;
    box-shadow: inset -5px 2px 0px 0px rgba(240,220,220,1);
    animation: bodyAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
    z-index: 1;
  }

  @keyframes headAnim {
    0% {
      top: 0px;
    }

    50% {
      top: 10px;
    }

    100% {
      top: 0px;
    }
  }

  @keyframes bodyAnim {
    0% {
      top: -5px;
    }

    50% {
      top: 10px;
    }

    100% {
      top: -5px;
    }
  }

  .circ {
    backface-visibility: hidden;
    margin: 60px auto;
    width: 180px;
    height: 180px;
    border-radius: 0px 0px 50px 50px;
    position: relative;
    z-index: 1;
    left: 0%;
    top: 20%;
    overflow: hidden;
  }

  .hands {
    margin-top: 140px;
    width: 120px;
    height: 120px;
    position: absolute;
    background-color: #111;
    border-radius: 20px;
    box-shadow: -1px -4px 0px 0px rgba(240,220,220,1);
    transform: rotate(45deg);
    top: 75%;
    left: 16%;
    z-index: 2;
    animation: bodyAnim 1.5s infinite alternate;
    animation-timing-function: ease-out;
  }
`;

const StyledTestPage = styled.div`
  padding: 40px;
  background: white;
  min-height: 100vh;

  h1 {
    text-align: center;
    margin-bottom: 40px;
    color: #333;
  }

  .testContainer {
    margin: 40px 0;
    padding: 20px;
    border: 2px dashed #ccc;
    text-align: center;

    h2 {
      margin-bottom: 20px;
      color: #666;
    }
  }
`;

export default TestPage;
