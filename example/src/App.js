// import React from 'react'
// import { MRT, adapters } from 'react-mrt'
// import './App.css'
// import sample_data from './sample.json'
// import 'antd/dist/antd.css'
// import html2canvas from 'html2canvas'

// class App extends React.Component {

//   constructor(props) {
//     super(props)
//     console.log("Sample_data: ", sample_data);
//     this.state = {
//       data: sample_data,
//       like: false,
//       userEdits: {}
//     };
//   }

//   onEdit(action, nodeId, value) {
//     let edit_data = {...this.state.userEdits};
//     let edit = edit_data[nodeId];
//     if(!edit) {
//       edit = edit_data[nodeId] = {}
//     }
//     switch(action) {
//       case "thumb-delete":
//         edit.rate = 0;
//         break;
//       case "thumb-up":
//         edit.rate = 1;
//         break;
//       case "thumb-down":
//         edit.rate = -1;
//         break;
//       case "exchange":
//         edit.clusterId = value;
//         break;
//       default:
//         return
//     }
//     this.setState({userEdits: edit_data})
//   }

//   render() {
//     const adapter = new adapters.PaperAdapter()
//     const adapterInput = {data: this.state.data, userEdits: this.state.userEdits}
//     const transformedData = adapter.transform(adapterInput)
//     const recommender = adapter.transformRecommender(adapterInput, 5)
//     return (
//       <div className="App">
//         <MRT data={transformedData} authors={["Somefive", "Rainatum", "Zelda", "Yiping", "Jizhong"]}
//           onLike={() => this.setState({like: !this.state.like})} like={this.state.like}
//           onEdit={(action, nodeId, value) => this.onEdit(action, nodeId, value)} userEdits={this.state.userEdits}
//           lang="en" shareable={true} likeable={true} loadable={true} onLoadJson={(json) => this.setState({data: json})}
//           html2canvas={html2canvas}
//           recommender={recommender}/>
//       </div>
//     );
//   }
// }

// export default App;
import React from 'react'
import { MRT, adapters } from 'react-mrt'
import sample_data from './sample.json'
import 'antd/dist/antd.css'
import html2canvas from 'html2canvas'

class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      data: sample_data
    };
  }

  render() {
    const adapter = new adapters.PaperAdapter()
    const adapterInput = {data: this.state.data, userEdits: {}}
    const transformedData = adapter.transform(adapterInput)
    return (
      <div className="App">
        <MRT data={transformedData} authors={["Da Yin", "Weng Lam Tam", "Ming Ding", "Jie Tang"]}
          lang="en" shareable={true} likeable={false} loadable={true} onLoadJson={(json) => this.setState({data: json})}
          html2canvas={html2canvas}/>
      </div>
    );
  }
}

export default App;